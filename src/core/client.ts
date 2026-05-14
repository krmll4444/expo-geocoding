import { MemoryCache, cacheKeyAutocomplete, cacheKeyReverse, cacheKeySearch } from './cache';
import { normalize, rankForAutocomplete } from './normalize';
import { ThrottledQueue, isAbortError } from './rateLimit';
import { createNominatimProvider } from '../providers/nominatim';
import type {
  AutocompleteOptions,
  GeocodingClientOptions,
  GeocodingProvider,
  PersistentCache,
  Place,
  ReverseOptions,
  SearchOptions,
} from './types';

const DEFAULT = 'expo-geocoding/0.1 (https://github.com/krmll4444/expo-geocoding)';

async function readPersistent<T>(cache: PersistentCache | undefined, key: string): Promise<T | undefined> {
  if (!cache) {
    return undefined;
  }
  const raw = await cache.get(key);
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

async function writePersistent(
  cache: PersistentCache | undefined,
  key: string,
  value: unknown,
  ttlMs: number,
): Promise<void> {
  if (!cache) {
    return;
  }
  await cache.set(key, JSON.stringify(value), ttlMs);
}

function mergeSignals(outer?: AbortSignal, inner?: AbortSignal): AbortSignal | undefined {
  if (!outer && !inner) {
    return undefined;
  }
  if (!outer) {
    return inner;
  }
  if (!inner) {
    return outer;
  }
  const c = new AbortController();
  const onAbort = () => c.abort();
  if (outer.aborted || inner.aborted) {
    c.abort();
    return c.signal;
  }
  outer.addEventListener('abort', onAbort);
  inner.addEventListener('abort', onAbort);
  return c.signal;
}

type PendingAutocomplete = { resolve: (p: Place[]) => void; reject: (e: unknown) => void };

export class GeocodingClient {
  private readonly memory: MemoryCache<Place | Place[]>;
  private readonly queue: ThrottledQueue;
  private readonly provider: GeocodingProvider;
  private readonly persistent?: PersistentCache;
  private readonly defaultTtlMs: number;
  private readonly autocompleteDebounceMs: number;
  private autocompleteTimer: ReturnType<typeof setTimeout> | null = null;
  private autocompleteFetchAbort: AbortController | null = null;
  private autocompletePending: PendingAutocomplete | null = null;

  constructor(options: GeocodingClientOptions = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 24 * 60 * 60 * 1000;
    this.autocompleteDebounceMs = options.autocompleteDebounceMs ?? 300;
    this.memory = new MemoryCache<Place | Place[]>(this.defaultTtlMs);
    this.queue = new ThrottledQueue(
      options.minRequestIntervalMs ?? 1000,
      options.maxRetries ?? 3,
      options.retryBackoffBaseMs ?? 1500,
    );
    this.persistent = options.persistentCache;
    this.provider =
      options.provider ??
      createNominatimProvider({
        baseUrl: options.baseUrl,
        userAgent: options.userAgent ?? DEFAULT,
      });
  }

  async search(query: string, options: SearchOptions = {}): Promise<Place[]> {
    const q = query.trim();
    if (!q) {
      return [];
    }
    const key = cacheKeySearch(q);
    if (!options.skipCache) {
      const mem = this.memory.get(key);
      if (Array.isArray(mem)) {
        return mem;
      }
      const disk = await readPersistent<Place[]>(this.persistent, key);
      if (disk?.length) {
        this.memory.set(key, disk, this.defaultTtlMs);
        return disk;
      }
    }

    const signal = options.signal;
    const rawList = await this.queue.run(
      () =>
        this.provider.search(q, {
          limit: options.limit ?? 10,
          language: options.language,
          countryCodes: options.countryCodes,
          signal,
        }),
      signal,
    );

    const places = rawList.map((r) => normalize(r));
    this.memory.set(key, places, this.defaultTtlMs);
    await writePersistent(this.persistent, key, places, this.defaultTtlMs);
    return places;
  }

  async reverse(coords: { lat: number; lon: number }, options: ReverseOptions = {}): Promise<Place> {
    const { lat, lon } = coords;
    const key = cacheKeyReverse(lat, lon);
    if (!options.skipCache) {
      const mem = this.memory.get(key);
      if (mem && !Array.isArray(mem)) {
        return mem;
      }
      const disk = await readPersistent<Place>(this.persistent, key);
      if (disk && typeof disk.lat === 'number') {
        this.memory.set(key, disk, this.defaultTtlMs);
        return disk;
      }
    }

    const signal = options.signal;
    const raw = await this.queue.run(
      () => this.provider.reverse(lat, lon, { language: options.language, signal }),
      signal,
    );
    const place = normalize(raw);
    this.memory.set(key, place, this.defaultTtlMs);
    await writePersistent(this.persistent, key, place, this.defaultTtlMs);
    return place;
  }

  /**
   * Debounced forward search tuned for quick UI feedback (cities + POIs first).
   * Superseded calls resolve with an empty list.
   */
  autocomplete(query: string, options: AutocompleteOptions = {}): Promise<Place[]> {
    return (async (): Promise<Place[]> => {
      const q = query.trim();
      if (!q) {
        return [];
      }

      if (this.autocompletePending) {
        this.autocompletePending.resolve([]);
        this.autocompletePending = null;
      }

      const key = cacheKeySearch(q);
      const acKey = cacheKeyAutocomplete(q);
      if (!options.skipCache) {
        const mem = this.memory.get(key);
        if (Array.isArray(mem)) {
          return rankForAutocomplete(mem).slice(0, 8);
        }
        const diskSearch = await readPersistent<Place[]>(this.persistent, key);
        if (diskSearch?.length) {
          this.memory.set(key, diskSearch, this.defaultTtlMs);
          return rankForAutocomplete(diskSearch).slice(0, 8);
        }
        const acMem = this.memory.get(acKey);
        if (Array.isArray(acMem)) {
          return acMem;
        }
        const diskAc = await readPersistent<Place[]>(this.persistent, acKey);
        if (diskAc?.length) {
          this.memory.set(acKey, diskAc, this.defaultTtlMs);
          return diskAc;
        }
      }

      this.autocompleteFetchAbort?.abort();
      const fetchAbort = new AbortController();
      this.autocompleteFetchAbort = fetchAbort;

      return await new Promise<Place[]>((resolve, reject) => {
        const pending: PendingAutocomplete = { resolve, reject };

        const onOuterAbort = () => {
          if (this.autocompleteTimer) {
            clearTimeout(this.autocompleteTimer);
            this.autocompleteTimer = null;
          }
          fetchAbort.abort();
          if (this.autocompletePending === pending) {
            pending.resolve([]);
            this.autocompletePending = null;
          }
        };

        if (options.signal?.aborted) {
          resolve([]);
          return;
        }
        options.signal?.addEventListener('abort', onOuterAbort, { once: true });

        this.autocompletePending = pending;

        if (this.autocompleteTimer) {
          clearTimeout(this.autocompleteTimer);
        }

        const merged = mergeSignals(options.signal, fetchAbort.signal);

        this.autocompleteTimer = setTimeout(() => {
          void (async () => {
            const activePending = this.autocompletePending;
            this.autocompleteTimer = null;
            if (!activePending) {
              return;
            }
            try {
              const rawList = await this.queue.run(
                () =>
                  this.provider.search(q, {
                    limit: 8,
                    language: options.language,
                    countryCodes: options.countryCodes,
                    signal: merged,
                  }),
                merged,
              );
              const places = rankForAutocomplete(rawList.map((r) => normalize(r))).slice(0, 8);
              this.memory.set(acKey, places, this.defaultTtlMs);
              await writePersistent(this.persistent, acKey, places, this.defaultTtlMs);
              activePending.resolve(places);
            } catch (e) {
              if (isAbortError(e) || options.signal?.aborted || fetchAbort.signal.aborted) {
                activePending.resolve([]);
                return;
              }
              activePending.reject(e);
            } finally {
              if (this.autocompletePending === activePending) {
                this.autocompletePending = null;
              }
            }
          })();
        }, this.autocompleteDebounceMs);
      });
    })();
  }

  clearMemoryCache(): void {
    this.memory.clear();
  }
}

let defaultClient: GeocodingClient | null = null;

export function getDefaultClient(): GeocodingClient {
  if (!defaultClient) {
    defaultClient = new GeocodingClient();
  }
  return defaultClient;
}

export function configureDefaultClient(options: GeocodingClientOptions): GeocodingClient {
  defaultClient = new GeocodingClient(options);
  return defaultClient;
}

export async function search(query: string, options?: SearchOptions): Promise<Place[]> {
  return getDefaultClient().search(query, options);
}

export async function reverse(coords: { lat: number; lon: number }, options?: ReverseOptions): Promise<Place> {
  return getDefaultClient().reverse(coords, options);
}

export function autocomplete(query: string, options?: AutocompleteOptions): Promise<Place[]> {
  return getDefaultClient().autocomplete(query, options);
}
