const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export function cacheKeySearch(query: string): string {
  return `search:${query.trim().toLowerCase()}`;
}

export function cacheKeyAutocomplete(query: string): string {
  return `autocomplete:${query.trim().toLowerCase()}`;
}

export function cacheKeyReverse(lat: number, lon: number): string {
  const r = (n: number) => n.toFixed(5);
  return `reverse:${r(lat)}:${r(lon)}`;
}

export class MemoryCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private defaultTtlMs: number = DEFAULT_TTL_MS) {}

  get(key: string): T | undefined {
    const row = this.store.get(key);
    if (!row) {
      return undefined;
    }
    if (Date.now() > row.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return row.value;
  }

  set(key: string, value: T, ttlMs: number = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
