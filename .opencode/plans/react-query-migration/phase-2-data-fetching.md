# Phase 2 — Data Fetching Layer

> **Goal:** Create the fetch function and queryOptions factory. Use React Query directly in App.tsx.
> **Estimated scope:** 2 new files (no separate useForecast hook file)

## 2.1 Create forecast fetcher

**File:** `src/lib/fetch-forecast.ts` (new)

```typescript
import type { CalendarConfig } from "@shared/types";
import type { ForecastResponse } from "@shared/forecast-types";

export async function fetchForecast(
  config: CalendarConfig,
  signal?: AbortSignal,
): Promise<ForecastResponse> {
  const params = new URLSearchParams({
    location: config.location,
    model: config.model.toString(),
    minSessionHours: config.minSessionHours.toString(),
    windEnabled: config.windEnabled.toString(),
    windMin: config.windMin.toString(),
    windMax: config.windMax.toString(),
    waveEnabled: config.waveEnabled.toString(),
  });

  if (config.waveEnabled) {
    params.set("waveSource", config.waveSource);
    params.set("waveHeightMin", config.waveHeightMin.toString());
    params.set("waveHeightMax", config.waveHeightMax.toString());
    params.set("wavePeriodMin", config.wavePeriodMin.toString());
  }

  const response = await fetch(`/api/forecast?${params}`, { signal });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body.length < 300 ? body : `HTTP ${response.status}`);
  }

  return response.json();
}
```

**Notes:**

- Param-building logic mirrors `buildApiUrl()` in `src/lib/subscribe-urls.ts:6-23`
  but targets `/api/forecast` instead of `/api/calendar`
- `signal` param allows React Query to abort in-flight requests on unmount/re-fetch
- Error handling: attempts to include API error message, truncates if too long
- **Best practice** (`js-early-exit`): early return on non-ok response

**Verify:**

- [ ] `pnpm check` passes

## 2.2 Create `queryOptions` factory

**File:** `src/lib/forecast-query.ts` (new)

```typescript
import { queryOptions } from "@tanstack/react-query";
import { fetchForecast } from "./fetch-forecast";
import type { CalendarConfig } from "@shared/types";

export function forecastQueryOptions(config: CalendarConfig) {
  return queryOptions({
    queryKey: ["forecast", config] as const,
    queryFn: ({ signal }) => fetchForecast(config, signal),
    enabled: !!config.location,
  });
}
```

**Why `queryOptions`?**

The `queryOptions` helper (added in React Query v5) provides:

1. Type-safe query key ↔ query function coupling
2. Reusable options that can be passed to `useQuery`, `queryClient.prefetchQuery`, etc.
3. A single source of truth for the query configuration

Reference: https://tanstack.com/query/latest/docs/framework/react/reference/queryOptions

**Query key design:**

```typescript
queryKey: ["forecast", config];
//          ─────────  ──────
//          namespace  all config params (auto-hashed by React Query)
```

React Query hashes object keys deterministically — so `{windMin: 14, windMax: 35}` and
`{windMax: 35, windMin: 14}` produce the same hash. When any config field changes,
the query key changes, triggering a new fetch.

**Note:** We do NOT create a separate `useForecast.ts` hook file. Just use `useQuery(forecastQueryOptions(config))`
directly in App.tsx. The hook adds no value — it's a one-line wrapper.

**Verify:**

- [ ] `pnpm check` passes
