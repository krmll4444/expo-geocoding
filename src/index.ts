export type {
  AutocompleteOptions,
  GeocodingClientOptions,
  GeocodingProvider,
  PersistentCache,
  Place,
  PlaceType,
  ProviderContext,
  ProviderKind,
  ProviderSearchContext,
  RawPlace,
  ReverseOptions,
  SearchOptions,
} from './core/types';

export { HttpError } from './core/errors';
export { normalize, rankForAutocomplete } from './core/normalize';
export { MemoryCache, cacheKeyAutocomplete, cacheKeyReverse, cacheKeySearch } from './core/cache';
export { ThrottledQueue, isAbortError } from './core/rateLimit';

export {
  GeocodingClient,
  autocomplete,
  configureDefaultClient,
  getDefaultClient,
  reverse,
  search,
} from './core/client';

export { createNominatimProvider } from './providers/nominatim';

export { useSearch } from './hooks/useSearch';
export type { UseSearchOptions } from './hooks/useSearch';

export { useReverse } from './hooks/useReverse';
export type { UseReverseOptions } from './hooks/useReverse';

export { useAutocomplete } from './hooks/useAutocomplete';
export type { UseAutocompleteOptions } from './hooks/useAutocomplete';

export { PlaceAutocomplete } from './ui/PlaceAutocomplete';
export type { PlaceAutocompleteProps } from './ui/PlaceAutocomplete';
