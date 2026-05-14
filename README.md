# expo-geocoding

**Expo-first geocoding for React Native** — a typed layer over forward and reverse geocoding with **no required native dependencies** in v1. The default backend is [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org); you can plug in your own provider (Mapbox, Google Places, self-hosted Nominatim, etc.).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## Why this library

Raw Nominatim usage in production often means: no caching, no rate-aware queue, messy JSON, inconsistent fields. **expo-geocoding** provides:

- A **single `Place` model** after normalizing OSM payloads  
- **In-memory cache** (default TTL 24h) and optional **`PersistentCache`** (e.g. MMKV / AsyncStorage with your adapter)  
- **Request queue + throttle** (~1 req/s by default, aligned with Nominatim etiquette) and **retry with backoff** on HTTP 429  
- **Imperative functions + React hooks** with debouncing and **`AbortSignal`** cancellation  
- **`PlaceAutocomplete`** — ready-made UI with match highlighting  

Works in **Expo Go** and normal dev/production builds: **TypeScript / JavaScript only** for this package version.

## Installation

```bash
npm install expo-geocoding
# or
yarn add expo-geocoding
```

**Peer dependencies:** `expo`, `react`, `react-native`.

When developing this repo locally:

```bash
npm install
npm run build
```

## Required: `User-Agent` and Nominatim policy

Public Nominatim usage is governed by the [OSM Foundation usage policy](https://operations.osmfoundation.org/policies/nominatim/). You must send an **identifiable `User-Agent`** (app name, version, contact). Configure once at startup in production:

```ts
import { configureDefaultClient } from 'expo-geocoding';

configureDefaultClient({
  userAgent: 'MyAwesomeApp/1.0 (contact@yourdomain.com)',
});
```

If omitted, the library falls back to a generic default (fine for quick tests only).

## Quick start

```ts
import { configureDefaultClient, search, reverse } from 'expo-geocoding';

configureDefaultClient({
  userAgent: 'MyApp/1.0 (you@example.com)',
});

const places = await search('Kyiv');
const place = await reverse({ lat: 50.45, lon: 30.52 });
```

## `Place` data model

All public APIs use this normalized shape:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable identifier |
| `name` | `string` | Short label for UI |
| `fullName` | `string` | Full display string |
| `lat` / `lon` | `number` | WGS84 coordinates |
| `city`, `country`, `street`, `postcode` | `string?` | Parsed when available |
| `type` | `'city' \| 'street' \| 'address' \| 'poi'?` | Heuristic from OSM class/type |

## Imperative API

### `search(query, options?)`

Forward geocoding (text → list of places). **No** built-in debounce here (use **`useSearch`** for debounced UI).

```ts
import { search } from 'expo-geocoding';

const results = await search('Berlin', {
  limit: 10,
  language: 'en',
  countryCodes: ['de'],
  signal: abortController.signal,
  skipCache: false,
});
```

### `reverse({ lat, lon }, options?)`

Reverse geocoding (coordinates → one `Place`).

```ts
import { reverse } from 'expo-geocoding';

const place = await reverse({ lat: 52.52, lon: 13.405 }, { language: 'de' });
```

### `autocomplete(query, options?)`

Fast suggestions: internal **debounce** (300ms by default), ranking that favors cities/POIs, a **separate cache key** from `search`, and cancellation via **`AbortSignal`**.

```ts
import { autocomplete } from 'expo-geocoding';

const suggestions = await autocomplete('Kos', { language: 'sk' });
```

## Client and global configuration

### `GeocodingClient`

Use a dedicated instance when you need isolated cache/queue (tests, multiple configs):

```ts
import { GeocodingClient, createNominatimProvider } from 'expo-geocoding';

const client = new GeocodingClient({
  userAgent: 'MyApp/1.0 (me@example.com)',
  minRequestIntervalMs: 1000,
  defaultTtlMs: 24 * 60 * 60 * 1000,
  autocompleteDebounceMs: 300,
  maxRetries: 3,
  baseUrl: 'https://nominatim.openstreetmap.org', // optional: self-hosted
  // provider: myCustomProvider,
  // persistentCache: myMmkvAdapter,
});

const list = await client.search('Lviv');
```

### `configureDefaultClient` / `getDefaultClient`

Top-level **`search`**, **`reverse`**, and **`autocomplete`** use a **singleton** client by default:

```ts
import { configureDefaultClient, getDefaultClient } from 'expo-geocoding';

configureDefaultClient({ userAgent: '...' });
const client = getDefaultClient();
```

## React hooks

All hooks accept an optional **`client?: GeocodingClient`**; otherwise the default singleton is used.

### `useSearch(query, options?)`

- **`debounceMs`**: default `300`  
- **`enabled`**: default `true`  
- Returns **`{ data, loading, error }`** with `data` as `Place[] | null`

```tsx
import { useState } from 'react';
import { Text, FlatList } from 'react-native';
import { useSearch } from 'expo-geocoding';

function SearchDemo() {
  const [q, setQ] = useState('');
  const { data, loading, error } = useSearch(q, { debounceMs: 300, limit: 8 });

  if (error) return <Text>{error.message}</Text>;
  if (loading) return <Text>Loading…</Text>;
  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <Text>{item.fullName}</Text>}
    />
  );
}
```

### `useReverse(coords, options?)`

- `coords`: `{ lat, lon } | null` — when `null`, no request runs  
- Returns **`{ data, loading, error }`** with `data` as `Place | null`

```tsx
import { useReverse } from 'expo-geocoding';

const { data, loading } = useReverse({ lat: 50.45, lon: 30.52 });
```

### `useAutocomplete(query, options?)`

Relies on the client’s **`autocomplete()`** debounce and cache. Returns **`{ suggestions, loading, error }`**.

```tsx
import { useAutocomplete } from 'expo-geocoding';

const { suggestions, loading } = useAutocomplete(query, { language: 'en' });
```

## UI: `PlaceAutocomplete`

Text field, suggestion list, loading indicator, match highlighting, keyboard dismiss on select.

```tsx
import { PlaceAutocomplete, type Place } from 'expo-geocoding';

export function Screen() {
  return (
    <PlaceAutocomplete
      placeholder="Search location"
      onSelect={(place: Place) => console.log(place.lat, place.lon)}
      maxSuggestions={8}
    />
  );
}
```

**Optional props:** `client`, `style`, `inputStyle`, `listStyle`, `maxSuggestions`.

`PlaceAutocomplete` is exported from the root entry (`expo-geocoding`) so consumers always resolve the same built bundle; there is no separate `expo-geocoding/ui` publish path.

## Custom provider

Implement **`GeocodingProvider`**: `search` / `reverse` must return **`RawPlace[]`** / **`RawPlace`**. Pass it into **`GeocodingClient`** via **`provider`**. The client normalizes to **`Place`** using **`normalize()`**.

**`createNominatimProvider({ userAgent, baseUrl? })`** is exported if you need multiple Nominatim endpoints without duplicating client setup.

## Persistent cache

Implement **`PersistentCache`** (`get` / `set` / `remove` as async). Values are stored as JSON strings.

```ts
const client = new GeocodingClient({
  userAgent: '...',
  persistentCache: {
    get: async (key) => storage.getString(key) ?? null,
    set: async (key, value, _ttlMs) => {
      /* persist with TTL if your backend supports it */
    },
    remove: async (key) => {
      storage.delete(key);
    },
  },
});
```

## Example app

The **`example/`** folder is a minimal Expo app using **`PlaceAutocomplete`** and **`configureDefaultClient`**.

```bash
cd example
npm install
npm run start
# then press i / a in the CLI, or in another terminal:
npm run ios
```

After native dependency changes on iOS: `cd example/ios && pod install`.

## Build and publish

```bash
npm run build   # TypeScript → build/
npm run clean
```

Before **`npm publish`**, ensure **`build/`** is up to date (the `prepare` script in `package.json` usually handles this).

## Limitations

- Public Nominatim has **strict limits**; for high traffic use a **dedicated instance** or another provider via **`GeocodingClient`** + **`provider`**.  
- This library does **not** ship Google/Mapbox API keys — only abstractions and a Nominatim default.  
- Follow the [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) and the terms of any geocoding API you use.

## License

[MIT](./LICENSE)
