import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeocodingClient } from '../core/client';
import { getDefaultClient } from '../core/client';
import type { Place } from '../core/types';

export interface UseReverseOptions {
  client?: GeocodingClient;
  enabled?: boolean;
  language?: string;
}

export function useReverse(
  coords: { lat: number; lon: number } | null,
  options: UseReverseOptions = {},
): { data: Place | null; loading: boolean; error: Error | null } {
  const client = useMemo(() => options.client ?? getDefaultClient(), [options.client]);
  const enabled = options.enabled ?? true;

  const [data, setData] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const seqRef = useRef(0);

  useEffect(() => {
    if (!coords || !enabled || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const ac = new AbortController();
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);

    void client
      .reverse(coords, { signal: ac.signal, language: options.language })
      .then((place) => {
        if (seq === seqRef.current) {
          setData(place);
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

    return () => {
      ac.abort();
    };
  }, [client, coords?.lat, coords?.lon, enabled, options.language]);

  return { data, loading, error };
}
