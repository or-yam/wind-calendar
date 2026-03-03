# Phase 2a: Backend Unification

**Date:** 2026-03-03  
**Status:** ✅ COMPLETE  
**Depends on:** Phase 1 (Open-Meteo isolated endpoint validated)  
**Completed:** 2026-03-03

---

## Goal

Merge Windguru and Open-Meteo providers into single `/api/calendar` endpoint with provider routing based on model ID.

**No UI changes in this phase.**

---

## Strategy

Simple 3-phase migration:

1. **Phase 2a (THIS PHASE):** Backend unification - single API handles both providers
2. **Phase 2b (LATER):** Frontend comparison - add Open-Meteo models to UI for testing
3. **Phase 2c (MUCH LATER):** Full cutover - make Open-Meteo primary

---

## Changes Required

### 1. Add Open-Meteo Models to Unified Registry

**File:** `shared/models.ts`

Add Open-Meteo models with namespace prefix:

```typescript
export const MODELS = {
  // Windguru (legacy numeric IDs)
  3: { id: 3, name: "GFS 13 km", provider: "windguru" },
  45: { id: 45, name: "ICON 13 km", provider: "windguru" },
  59: { id: 59, name: "GDPS 15 km", provider: "windguru" },
  117: { id: 117, name: "IFS-HRES 9 km", provider: "windguru" },

  // Open-Meteo (string IDs with namespace)
  om_gfs: { id: "om_gfs", name: "GFS 13 km", provider: "openmeteo", openMeteoSlug: "gfs_global" },
  om_icon: {
    id: "om_icon",
    name: "ICON 13 km",
    provider: "openmeteo",
    openMeteoSlug: "icon_global",
  },
  om_gdps: {
    id: "om_gdps",
    name: "GDPS 15 km",
    provider: "openmeteo",
    openMeteoSlug: "gem_global",
  },
  om_ifs: {
    id: "om_ifs",
    name: "IFS-HRES 9 km",
    provider: "openmeteo",
    openMeteoSlug: "ecmwf_ifs025",
  },
} as const;

export type ModelId = keyof typeof MODELS;
export type Provider = "windguru" | "openmeteo";

export function isValidModelId(id: number | string): id is ModelId {
  return id in MODELS;
}

export function getProvider(modelId: ModelId): Provider {
  return MODELS[modelId].provider;
}

// Map Open-Meteo model ID to Windguru fallback model ID
export function getWindguruFallback(openMeteoModelId: string): number | null {
  const map: Record<string, number> = {
    om_gfs: 3,
    om_icon: 45,
    om_gdps: 59,
    om_ifs: 117,
  };
  return map[openMeteoModelId] ?? null;
}
```

---

### 2. Update Type Definitions

**File:** `shared/types.ts`

Change `model` field to accept both numbers and strings:

```typescript
export interface CalendarConfig {
  location: string;
  windMin: number;
  windMax: number;
  minSessionHours: number;
  model: number | string; // Support both Windguru (number) and Open-Meteo (string)
  waveHeightMin: number;
}
```

---

### 3. Update Query Param Parsing

**File:** `server/config.ts`

Parse both numeric and string model IDs:

```typescript
import { isValidModelId } from "../shared/models.js";

export function parseQueryParams(params: URLSearchParams): CalendarConfig {
  // ... existing location/wind/session parsing

  const modelParam = params.get("model");
  if (!modelParam) {
    throw new Error("Missing required parameter: model");
  }

  // Try parse as number first (legacy Windguru IDs like "3", "45")
  const numericModel = Number(modelParam);
  const modelId = Number.isNaN(numericModel) ? modelParam : numericModel;

  if (!isValidModelId(modelId)) {
    throw new Error(`Invalid model: ${modelParam}`);
  }

  return {
    location: locationId,
    windMin,
    windMax,
    minSessionHours,
    model: modelId, // Can be number (3, 45) or string ("om_gfs", "om_icon")
    waveHeightMin,
  };
}
```

---

### 4. Add Provider Routing to Main API Endpoint

**File:** `api/calendar.ts`

Add provider routing logic with fallback:

```typescript
import { getProvider, getWindguruFallback, MODELS } from "../shared/models.js";
import { fetchOpenMeteoData } from "../server/open-meteo/forecast.js";

// ... existing imports

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ... existing rate limit, query parsing, location resolution

  const provider = getProvider(config.model);

  let fetchResult: Awaited<ReturnType<typeof fetchWindData>> | null = null;
  let dataSource: "windguru" | "openmeteo" = provider;
  let fallbackUsed = false;

  if (provider === "openmeteo") {
    // Open-Meteo path with Windguru fallback
    if (!location.coordinates) {
      return res.status(500).json({
        error: "Location coordinates unavailable for Open-Meteo",
        code: "MISSING_COORDINATES",
      });
    }

    const model = MODELS[config.model];
    const openMeteoSlug = (model as any).openMeteoSlug; // Type assertion for union

    console.log(`[API] Fetching Open-Meteo: ${config.location}, model ${openMeteoSlug}`);

    const { data: omData, error: omError } = await tryCatch(
      fetchOpenMeteoData(
        location.coordinates.lat,
        location.coordinates.lon,
        openMeteoSlug,
        location.tz,
      ),
    );

    if (omError) {
      // Fallback to Windguru
      console.error(`[API] Open-Meteo failed: ${omError.message}`);
      const fallbackModelId = getWindguruFallback(config.model as string);

      if (fallbackModelId) {
        console.log(`[API] Falling back to Windguru model ${fallbackModelId}`);
        const { data: wgData, error: wgError } = await tryCatch(
          fetchWindData(location.spotId, fallbackModelId),
        );

        if (wgError) {
          const { status, body } = classifyFetchError(wgError, location.spotId, isDev);
          return res.status(status).json(body);
        }

        fetchResult = wgData;
        dataSource = "windguru";
        fallbackUsed = true;
      } else {
        return res.status(502).json({
          error: "Open-Meteo request failed",
          code: "OPENMETEO_FAILED",
          ...(isDev && { debug: { message: omError.message } }),
        });
      }
    } else {
      fetchResult = omData;
      dataSource = "openmeteo";
    }
  } else {
    // Windguru path (no fallback to Open-Meteo)
    console.log(`[API] Fetching Windguru: ${config.location}, model ${config.model}`);

    const { data: wgData, error: wgError } = await tryCatch(
      fetchWindData(location.spotId, config.model as number),
    );

    if (wgError) {
      const { status, body } = classifyFetchError(wgError, location.spotId, isDev);
      return res.status(status).json(body);
    }

    fetchResult = wgData;
    dataSource = "windguru";
  }

  // ... existing buildCalendar, ICS generation

  // Add response headers
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("X-Data-Source", dataSource);
  if (fallbackUsed) {
    res.setHeader("X-Fallback-Used", "true");
  }
  res.setHeader(
    "Cache-Control",
    "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
  );
  res.setHeader("Content-Disposition", `inline; filename="wind-forecast-${config.location}.ics"`);

  return res.status(200).send(icsString);
}
```

---

## Fallback Logic

**Confirmed behavior:**

1. **Open-Meteo model fails:**
   - Try equivalent Windguru model
   - Return data with headers: `X-Data-Source: windguru`, `X-Fallback-Used: true`
   - Log fallback event

2. **Windguru model fails:**
   - Just fail with error (no fallback to Open-Meteo)
   - Return 502/504 error as before

**Reasoning:**

- Open-Meteo has no ToS restrictions → safe to use as primary
- Windguru prohibits automation → only use as emergency fallback
- If user explicitly selects Windguru (`model=3`), honor that choice

---

## Testing Plan

### 1. Open-Meteo Success Path

```bash
curl 'http://localhost:3001/api/calendar?location=tel-aviv&model=om_gfs&wind_min=5'
# Should return ICS with header: X-Data-Source: openmeteo
```

### 2. Open-Meteo Fallback Path

Mock Open-Meteo failure, verify Windguru fallback:

```bash
# Temporarily break Open-Meteo API or use invalid coordinates
curl 'http://localhost:3001/api/calendar?location=tel-aviv&model=om_gfs'
# Should return ICS with headers: X-Data-Source: windguru, X-Fallback-Used: true
```

### 3. Windguru Path (No Fallback)

```bash
curl 'http://localhost:3001/api/calendar?location=tel-aviv&model=3&wind_min=5'
# Should return ICS with header: X-Data-Source: windguru
# No X-Fallback-Used header
```

### 4. Backward Compatibility

```bash
# Existing calendar subscriptions should continue working
curl 'http://localhost:3001/api/calendar?location=eilat&model=45'
# Should return ICS (Windguru ICON model)
```

### 5. All 8 Models

Test all model IDs work:

- Windguru: `3`, `45`, `59`, `117`
- Open-Meteo: `om_gfs`, `om_icon`, `om_gdps`, `om_ifs`

---

## Files Modified

**Backend (4 files):**

1. ✅ `shared/models.ts` - Add Open-Meteo models + helper functions
2. ✅ `shared/types.ts` - Update `CalendarConfig.model` type
3. ✅ `server/config.ts` - Parse string model IDs + return coordinates
4. ✅ `api/calendar.ts` - Add provider routing + fallback logic

**Frontend (3 files - type compatibility only, NO UI changes):** 5. ✅ `src/App.tsx` - Update types to support `number | string` models 6. ✅ `src/components/Hero.tsx` - Update prop types 7. ✅ `src/components/ConfigForm.tsx` - Update prop types and model parsing

**Files NOT modified:**

- ✅ `api/calendar-openmeteo.ts` - kept for QA/testing per requirement

---

## Breaking Changes

**None.** Fully backward compatible:

- Existing URLs with `?model=3` continue to work
- Existing calendar subscriptions unaffected
- New model IDs (`om_gfs`, etc.) are opt-in

---

## Implementation Results

✅ **All tests passed:**

1. **Open-Meteo success path:**
   - `?model=om_gfs` → 200 OK with `X-Data-Source: openmeteo`
   - All 4 models tested: `om_gfs`, `om_icon`, `om_gdps`, `om_ifs` ✓

2. **Windguru backward compatibility:**
   - `?model=3` → 200 OK with `X-Data-Source: windguru`
   - All 4 models tested: `3`, `45`, `59`, `117` ✓

3. **Open-Meteo → Windguru fallback:**
   - Mocked Open-Meteo failure
   - Request succeeded with `X-Data-Source: windguru` and `X-Fallback-Used: true` ✓

4. **Build validation:**
   - TypeScript: `pnpm run typecheck` ✓
   - Linter: `pnpm run lint` ✓

---

## Current State

After this phase:

- ✅ `/api/calendar` handles both Windguru and Open-Meteo providers
- ✅ Users can use Open-Meteo via `?model=om_gfs` URLs
- ✅ Fallback provides reliability (Open-Meteo → Windguru)
- ✅ Frontend still shows only Windguru models (no UI changes per plan)
- ✅ `/api/calendar-openmeteo` kept for QA/testing
- ✅ Response headers: `X-Data-Source`, `X-Fallback-Used`

**Next phase (2b):** Add Open-Meteo models to frontend dropdown for user testing.

---

## Resolved Questions

1. **Should we delete `/api/calendar-openmeteo` after this phase?**
   - ✅ **RESOLVED:** Keep for QA (per user requirement)
2. **Logging detail level?**
   - ✅ **RESOLVED:** Console logs are fine (per user confirmation)

3. **Response headers sufficient for monitoring?**
   - ✅ **IMPLEMENTED:** `X-Data-Source` and `X-Fallback-Used` headers added
