import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeocodingClient } from '../core/client';
import { getDefaultClient } from '../core/client';
import type { Place } from '../core/types';

export interface UseSearchOptions {
  client?: GeocodingClient;
  debounceMs?: number;
  enabled?: boolean;
  limit?: number;
  language?: string;
  countryCodes?: string[];
}

export function useSearch(
  query: string,
  options: UseSearchOptions = {},
): { data: Place[] | null; loading: boolean; error: Error | null } {
  const client = useMemo(() => options.client ?? getDefaultClient(), [options.client]);
  const debounceMs = options.debounceMs ?? 300;
  const enabled = options.enabled ?? true;

  const [data, setData] = useState<Place[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const seqRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || !q) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const ac = new AbortController();
    const seq = ++seqRef.current;

    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      void client
        .search(q, {
          signal: ac.signal,
          limit: options.limit,
          language: options.language,
          countryCodes: options.countryCodes,
        })
        .then((places) => {
          if (seq === seqRef.current) {
            setData(places);
          }
        })
        .catch((e: unknown) => {
          if (seq === seqRef.current && !ac.signal.aborted) {
            setError(e instanceof Error ? e : new Error(String(e)));
            setData(null);
          }
        })
        .finally(() => {
          if (seq === seqRef.current) {
            setLoading(false);
          }
        });
    }, debounceMs);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [
    client,
    debounceMs,
    enabled,
    options.countryCodes,
    options.language,
    options.limit,
    query,
  ]);

  return { data, loading, error };
}
