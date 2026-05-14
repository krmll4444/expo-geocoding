import { HttpError } from '../core/errors';
import type { GeocodingProvider, ProviderContext, ProviderSearchContext, RawPlace } from '../core/types';

const DEFAULT_BASE = 'https://nominatim.openstreetmap.org';

export interface NominatimProviderOptions {
  baseUrl?: string;
  /** Required for production use (Nominatim usage policy). */
  userAgent: string;
}

export function createNominatimProvider(options: NominatimProviderOptions): GeocodingProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
  const headers: HeadersInit = {
    Accept: 'application/json',
    'User-Agent': options.userAgent,
  };

  async function parseJson(res: Response): Promise<unknown> {
    if (res.status === 429) {
      throw new HttpError('Rate limited', 429);
    }
    if (!res.ok) {
      throw new HttpError(`HTTP ${res.status}`, res.status);
    }
    return res.json() as Promise<unknown>;
  }

  return {
    id: 'nominatim',
    async search(query: string, ctx: ProviderSearchContext): Promise<RawPlace[]> {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: String(ctx.limit ?? 10),
      });
      if (ctx.language) {
        params.set('accept-language', ctx.language);
      }
      if (ctx.countryCodes?.length) {
        params.set('countrycodes', ctx.countryCodes.join(','));
      }
      const url = `${baseUrl}/search?${params.toString()}`;
      const res = await fetch(url, { headers, signal: ctx.signal });
      const data = await parseJson(res);
      if (!Array.isArray(data)) {
        return [];
      }
      return data as RawPlace[];
    },
    async reverse(lat: number, lon: number, ctx: ProviderContext): Promise<RawPlace> {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        format: 'json',
        addressdetails: '1',
      });
      if (ctx.language) {
        params.set('accept-language', ctx.language);
      }
      const url = `${baseUrl}/reverse?${params.toString()}`;
      const res = await fetch(url, { headers, signal: ctx.signal });
      const data = await parseJson(res);
      if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid reverse geocoding response');
      }
      return data as RawPlace;
    },
  };
}
