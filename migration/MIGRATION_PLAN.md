# Migration Plan: Windguru → Open-Meteo

## Why

Windguru's Terms prohibit automated access and republishing of their data. The forecast models themselves (GFS, ICON, GDPS, IFS-HRES, WW3) are public domain data produced by government weather agencies. Open-Meteo serves the same model data via a free, documented REST API with explicit open-source-friendly terms (CC-BY 4.0).

## Model Mapping

| Current (Windguru) | Model ID | Open-Meteo equivalent   | Open-Meteo `models` param |
| ------------------ | -------- | ----------------------- | ------------------------- |
| GFS 13 km          | 3        | NOAA GFS 0.11° (~13 km) | `gfs_global`              |
| ICON 13 km         | 45       | DWD ICON Global 13 km   | `icon_global`             |
| GDPS 15 km         | 59       | GEM Global 15 km (CMC)  | `gem_global`              |
| IFS-HRES 9 km      | 117      | ECMWF IFS 0.25° (9 km)  | `ecmwf_ifs025`            |
| Wave model (WW3)   | 84       | NCEP GFS Wave 0.25°     | Marine API                |

All four wind models and the wave model are available on Open-Meteo.

## API Endpoints

### Wind forecast

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lon}
  &hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m
  &wind_speed_unit=kn
  &timezone=auto
  &forecast_days=7
  &models={model}
```

Response (simplified):

```json
{
  "hourly": {
    "time": ["2026-03-03T00:00", "2026-03-03T01:00", ...],
    "wind_speed_10m": [12.5, 14.2, ...],
    "wind_direction_10m": [270, 285, ...],
    "wind_gusts_10m": [18.1, 20.3, ...]
  }
}
```

### Wave forecast

```
GET https://marine-api.open-meteo.com/v1/marine
  ?latitude={lat}
  &longitude={lon}
  &hourly=wave_height
  &timezone=auto
  &forecast_days=7
```

Response (simplified):

```json
{
  "hourly": {
    "time": ["2026-03-03T00:00", "2026-03-03T01:00", ...],
    "wave_height": [0.8, 0.9, ...]
  }
}
```

### Sunrise/Sunset (currently from Windguru spot info)

Open-Meteo doesn't include sunrise/sunset in the forecast endpoint, but has a `daily` parameter:

```
&daily=sunrise,sunset
```

Returns ISO timestamps. Can be added to the same wind forecast request.

## What Changes

### 1. `shared/locations.ts` — Replace Windguru spot IDs with coordinates

```ts
// Before
{ spotId: "308", tz: "Asia/Jerusalem", label: "Tel Aviv", models: [...] }

// After
{ lat: 32.08, lon: 34.78, tz: "Asia/Jerusalem", label: "Tel Aviv", models: [...] }
```

Each location needs `lat`/`lon` instead of `spotId`. Coordinates for all spots can be pulled from the Windguru spot info responses (already in the `SpotInfo` type) or looked up manually.

The `models` array changes from Windguru IDs to Open-Meteo model slugs.

### 2. `shared/models.ts` — New model IDs

```ts
// Before
export const MODELS = {
  3: { id: 3, name: "GFS 13 km" },
  45: { id: 45, name: "ICON 13 km" },
  ...
};

// After
export const MODELS = {
  gfs_global: { id: "gfs_global", name: "GFS 13 km" },
  icon_global: { id: "icon_global", name: "ICON 13 km" },
  gem_global: { id: "gem_global", name: "GDPS 15 km" },
  ecmwf_ifs025: { id: "ecmwf_ifs025", name: "IFS-HRES 9 km" },
};
```

This is a breaking change for existing calendar URLs. Needs a mapping layer or redirect for old `model=3` params → `model=gfs_global`.

### 3. `server/scraper/` → `server/forecast/` — Rewrite fetch layer

**Delete:**

- `server/scraper/fetch.ts` — Windguru HTTP client
- `server/scraper/forecast.ts` — Windguru spot info + model orchestration
- `server/scraper/api-scraper.ts` — Windguru data extraction
- `server/types/api-response.ts` — Windguru `APIRoot` type
- `server/types/forecast.ts` — Windguru `SpotInfo` type

**Create:**

- `server/forecast/fetch.ts` — Open-Meteo HTTP client
- `server/forecast/open-meteo.ts` — Wind + wave + sunrise/sunset fetching
- `server/types/open-meteo.ts` — Open-Meteo response types

The core data extraction simplifies massively. Windguru requires:

1. Fetch spot info → extract `rundef` → fetch forecast with `rundef` → decode `initstamp + hours[]` into timestamps

Open-Meteo returns:

1. Fetch forecast → get `time[]` array with ISO timestamps directly

### 4. `server/types/wind-conditions.ts` — No change

`WindConditionRaw` stays the same. It's the internal type downstream of the fetch layer.

```ts
type WindConditionRaw = {
  date: Date;
  windSpeed: number | null;
  windGusts: number | null;
  windDirection: number | null;
  waveHeight: number | null;
};
```

This is the contract between the fetch layer and the calendar generation. Everything downstream of this type is unaffected.

### 5. `api/calendar.ts` — Minimal changes

The API handler calls `fetchWindData()` which returns `WindConditionRaw[]`. As long as the new fetch layer returns the same shape, the calendar generation, session grouping, and ICS output are untouched.

Changes:

- Validate `model` param as Open-Meteo slug instead of numeric ID
- Resolve `location` to `lat/lon` instead of `spotId`
- Update error messages (no more "Windguru" references in error classification)

### 6. Frontend — Update model selector

The model selector dropdown uses numeric IDs. Needs to use string slugs. The location selector is unaffected (it uses location keys like `"tel-aviv"`).

### 7. Attribution

Open-Meteo requires CC-BY 4.0 attribution. Add a visible link/credit in the UI, e.g.:

> "Weather data by [Open-Meteo.com](https://open-meteo.com/)"

## What Doesn't Change

- Calendar generation logic (`server/calendar/`)
- Session grouping / wind filtering
- ICS format and event structure
- Rate limiting (`server/utils/rate-limit.ts`)
- CDN caching strategy
- Frontend UI (except model selector values)
- All test logic (just update mocked responses)

## Migration Steps

### Phase 1 (COMPLETE - 2026-03-03)

1. ✅ **Add Open-Meteo types** — Define response types for both endpoints
2. ✅ **Add coordinates to locations** — Look up lat/lon for each spot
3. ✅ **Rewrite fetch layer** — New `server/open-meteo/` module returning `WindConditionRaw[]`
4. ✅ **Create isolated endpoint** — `/api/calendar-openmeteo` for testing

### Phase 2a (COMPLETE - 2026-03-03)

5. ✅ **Update model IDs** — String slugs (`om_gfs`, etc.), backward-compat for old URLs
6. ✅ **Update API handler** — Unified provider routing in `/api/calendar`
7. ✅ **Implement fallback** — Open-Meteo → Windguru failover

### Phase 2b (COMPLETE - 2026-03-03)

8. ✅ **Update frontend** — Model selector with provider grouping ("Open-Meteo (Recommended)" / "Windguru")
9. ✅ **Add Open-Meteo attribution** — Footer with link to Open-Meteo.com
10. ✅ **Fix failing tests** — Updated test assertions for new error structure (`debug.locationInfo`)
11. ✅ **Fix CSP for dev** — Relaxed Content Security Policy for Vite dev mode compatibility

### Phase 3 (IN PROGRESS)

12. ✅ **Apply CSP conditionally** — Environment-based CSP via Vite plugin (strict prod, relaxed dev)
13. ⏳ **Update tests with Open-Meteo mocks** — Add test coverage for Open-Meteo provider
14. ⏳ **Delete Windguru code** — Remove `server/scraper/`, old types (or keep as fallback)
15. ⏳ **Update README** — Remove Windguru references, document Open-Meteo

## Resolved Questions

- ✅ **Backward compat for existing calendar subscriptions with `model=3`?** → Silent mapping, fully backward compatible
- ✅ **Open-Meteo free tier is 10K calls/day — enough?** → Yes, current usage ~288 calls/day
- ✅ **Sunrise/sunset: use Open-Meteo `daily` param?** → Yes, implemented in Phase 1
- ✅ **Inland spots marine API coverage?** → Non-fatal failure pattern, works correctly

## Open Questions (Phase 2b+)

- Should Windguru be deprecated or kept indefinitely as fallback?
- Monitoring/alerting for fallback usage?
- When to make Open-Meteo the default in UI?
