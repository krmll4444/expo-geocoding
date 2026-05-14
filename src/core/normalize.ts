import type { Place, PlaceType, RawPlace } from './types';

function toNumber(value: string | number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : NaN;
}

function pickId(raw: RawPlace): string {
  if (raw.place_id !== undefined && raw.place_id !== '') {
    return String(raw.place_id);
  }
  if (raw.osm_type !== undefined && raw.osm_id !== undefined) {
    return `${raw.osm_type}:${raw.osm_id}`;
  }
  return `${raw.lat},${raw.lon}:${raw.display_name.slice(0, 80)}`;
}

function mapOsmTypeToPlaceType(osmClass: string | undefined, osmType: string | undefined): PlaceType | undefined {
  const cls = (osmClass ?? '').toLowerCase();
  const typ = (osmType ?? '').toLowerCase();

  if (cls === 'place' && (typ === 'city' || typ === 'town' || typ === 'village' || typ === 'municipality')) {
    return 'city';
  }
  if (cls === 'highway' || typ === 'residential' || typ === 'road' || typ === 'street') {
    return 'street';
  }
  if (cls === 'amenity' || cls === 'shop' || cls === 'tourism' || cls === 'leisure' || cls === 'historic') {
    return 'poi';
  }
  if (cls === 'building' || cls === 'place' && typ === 'house') {
    return 'address';
  }
  if (cls === 'place') {
    return 'city';
  }
  return undefined;
}

function inferFromDisplayName(displayName: string): { city?: string; country?: string; street?: string; postcode?: string } {
  const parts = displayName
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return {};
  }
  const country = parts[parts.length - 1];
  const city = parts.length >= 2 ? parts[parts.length - 2] : undefined;
  const street = parts.length >= 3 ? parts.slice(0, parts.length - 2).join(', ') : parts[0];
  const postcodeMatch = displayName.match(/\b\d{4,6}\b/);
  const postcode = postcodeMatch ? postcodeMatch[0] : undefined;
  return { city, country, street, postcode };
}

/**
 * Normalizes provider-specific payloads into a stable {@link Place} model.
 */
export function normalize(raw: RawPlace): Place {
  const lat = toNumber(raw.lat);
  const lon = toNumber(raw.lon);
  const addr = raw.address ?? {};

  const city =
    addr.city ??
    addr.town ??
    addr.village ??
    addr.municipality ??
    addr.hamlet ??
    addr.suburb ??
    addr.county;

  const country = addr.country;
  const street =
    addr.road !== undefined && addr.house_number !== undefined
      ? `${addr.road} ${addr.house_number}`
      : addr.road ?? addr.pedestrian ?? addr.path;
  const postcode = addr.postcode;

  const inferred = !city || !country ? inferFromDisplayName(raw.display_name) : {};

  const name =
    raw.name ??
    (addr.house_number !== undefined && addr.road !== undefined
      ? `${addr.road} ${addr.house_number}`
      : addr.city ?? addr.town ?? addr.road ?? raw.display_name.split(',')[0]?.trim() ?? raw.display_name);

  const type: PlaceType | undefined =
    mapOsmTypeToPlaceType(raw.class, raw.type) ??
    (raw.addresstype === 'city' || raw.addresstype === 'town' ? 'city' : undefined);

  return {
    id: pickId(raw),
    name,
    fullName: raw.display_name,
    lat,
    lon,
    city: city ?? inferred.city,
    country: country ?? inferred.country,
    street: street ?? inferred.street,
    postcode: postcode ?? inferred.postcode,
    type,
  };
}

const CITY_WEIGHT: Record<PlaceType, number> = {
  city: 4,
  poi: 3,
  street: 2,
  address: 1,
};

/** Prioritize cities and POIs for autocomplete-style lists. */
export function rankForAutocomplete(places: Place[]): Place[] {
  return [...places].sort((a, b) => {
    const wa = a.type !== undefined ? CITY_WEIGHT[a.type] ?? 0 : 0;
    const wb = b.type !== undefined ? CITY_WEIGHT[b.type] ?? 0 : 0;
    if (wa !== wb) {
      return wb - wa;
    }
    return a.fullName.localeCompare(b.fullName);
  });
}
