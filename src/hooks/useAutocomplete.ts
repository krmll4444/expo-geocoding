import { useEffect, useMemo, useState } from 'react';
import type { GeocodingClient } from '../core/client';
import { getDefaultClient } from '../core/client';
import type { Place } from '../core/types';

export interface UseAutocompleteOptions {
  client?: GeocodingClient;
  enabled?: boolean;
  language?: string;
  countryCodes?: string[];
}

/**
 * Autocomplete with debounce, cancellation, and caching handled by {@link GeocodingClient}.
 */
export function useAutocomplete(
  query: string,
  options: UseAutocompleteOptions = {},
): { suggestions: Place[]; loading: boolean; error: Error | null } {
  const client = useMemo(() => options.client ?? getDefaultClient(), [options.client]);
  const enabled = options.enabled ?? true;

  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || !q) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    void client
      .autocomplete(q, {
        signal: ac.signal,
        language: options.language,
        countryCodes: options.countryCodes,
      })
      .then((list) => {
        if (!ac.signal.aborted) {
          setSuggestions(list);
        }
      })
      .catch((e: unknown) => {
        if (!ac.signal.aborted) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      ac.abort();
    };
  }, [client, enabled, options.countryCodes, options.language, query]);

  return { suggestions, loading, error };
}
