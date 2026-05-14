export type PlaceType = 'city' | 'street' | 'address' | 'poi';

export type Place = {
  id: string;
  name: string;
  fullName: string;
  lat: number;
  lon: number;
  city?: string;
  country?: string;
  street?: string;
  postcode?: string;
  type?: PlaceType;
};

/** Minimal shape providers must yield before normalization. */
export type RawPlace = {
  place_id?: number | string;
  osm_type?: string;
  osm_id?: number | string;
  lat: string | number;
  lon: string | number;
  display_name: string;
  name?: string;
  class?: string;
  type?: string;
  addresstype?: string;
  address?: Record<string, string | undefined>;
};

export type ProviderKind = 'nominatim' | 'custom';

export interface GeocodingProvider {
  readonly id: string;
  search(query: string, options: ProviderSearchContext): Promise<RawPlace[]>;
  reverse(lat: number, lon: number, options: ProviderContext): Promise<RawPlace>;
}

export interface ProviderContext {
  signal?: AbortSignal;
  language?: string;
}

export interface ProviderSearchContext extends ProviderContext {
  limit?: number;
  countryCodes?: string[];
}

export interface PersistentCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface GeocodingClientOptions {
  /** Default ~1 req/s for Nominatim. */
  minRequestIntervalMs?: number;
  /** Default 24h. */
  defaultTtlMs?: number;
  /** Debounce for `autocomplete()` only. */
  autocompleteDebounceMs?: number;
  maxRetries?: number;
  retryBackoffBaseMs?: number;
  /** Identify your app (Nominatim policy). */
  userAgent?: string;
  baseUrl?: string;
  provider?: GeocodingProvider;
  persistentCache?: PersistentCache;
}

export interface SearchOptions {
  limit?: number;
  language?: string;
  countryCodes?: string[];
  signal?: AbortSignal;
  skipCache?: boolean;
}

export interface ReverseOptions {
  language?: string;
  signal?: AbortSignal;
  skipCache?: boolean;
}

export interface AutocompleteOptions {
  language?: string;
  countryCodes?: string[];
  signal?: AbortSignal;
  skipCache?: boolean;
}
