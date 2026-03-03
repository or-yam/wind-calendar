# Phase 3: Open-Meteo Test Coverage

**Date:** 2026-03-03  
**Status:** ✅ COMPLETE  
**Depends on:** Phase 2b (Frontend UI updates)  
**Completed:** 2026-03-03

---

## Goal

Add comprehensive test coverage for Open-Meteo provider to validate the migration and ensure production reliability.

---

## Test Coverage Added

### 1. Unit Tests for Open-Meteo Fetch Layer

**File:** `tests/unit/open-meteo/forecast.test.ts`

**Coverage:** 9 tests for `server/open-meteo/forecast.ts`

Tests include:

- ✅ Successful wind + wave data fetching
- ✅ Wave data fetch failure (non-fatal pattern)
- ✅ Wind forecast API failure
- ✅ Missing sunrise/sunset data handling
- ✅ Null values in wind data arrays
- ✅ Timezone offset parsing (UTC+2, UTC+3)
- ✅ Wave data merging by timestamp matching
- ✅ Open-Meteo API validation errors
- ✅ Time extraction from ISO timestamps

**Key Test Scenarios:**

```typescript
// Timezone offset test
// "2026-03-03T00:00" in Asia/Jerusalem (UTC+3) = "2026-03-02T21:00" UTC
const expectedDate = new Date("2026-03-02T21:00:00.000Z");
expect(result.windData[0].date.toISOString()).toBe(expectedDate.toISOString());

// Wave data merge test
expect(result.windData[1].waveHeight).toBe(0.9); // Match for hour 1
expect(result.windData[0].waveHeight).toBeNull(); // No match for hour 0
```

---

### 2. Integration Tests for Provider Routing

**File:** `tests/integration/api/open-meteo.test.ts`

**Coverage:** 10 tests for `/api/calendar` with Open-Meteo models

Tests include:

- ✅ Successful Open-Meteo data fetch → ICS calendar
- ✅ All 4 Open-Meteo models (`om_gfs`, `om_icon`, `om_gdps`, `om_ifs`)
- ✅ Open-Meteo → Windguru fallback on forecast API failure
- ✅ Both providers failing (502 error)
- ✅ Open-Meteo validation errors with fallback
- ✅ Marine API failure (non-fatal, wind data only)
- ✅ No reverse fallback (Windguru → Open-Meteo)
- ✅ Wind filter application to Open-Meteo data
- ✅ Wave height in event summaries
- ✅ Correct cache headers

**Key Test Scenarios:**

```typescript
// Fallback test
installFetchMock((url) => {
  if (url.hostname === "api.open-meteo.com") {
    return new Response("Open-Meteo API error", { status: 500 });
  }
  return null; // Use Windguru mock
});

expect(result.headers["x-data-source"]).toBe("windguru");
expect(result.headers["x-fallback-used"]).toBe("true");

// No reverse fallback test
const req = mockReq("/api/calendar?location=tel-aviv&model=3"); // Windguru model
// All APIs fail
expect(result.statusCode).toBe(502);
expect(result.headers["x-fallback-used"]).toBeUndefined(); // No fallback to OM
```

---

## Test Results

**Before this phase:** 65 tests passing (all Windguru-only)  
**After this phase:** 84 tests passing (+19 Open-Meteo tests)

**Test breakdown:**

- Unit tests: 59 tests (9 new Open-Meteo tests)
- Integration tests: 25 tests (10 new Open-Meteo tests)

**Build validation:**

- ✅ TypeScript: No errors (`pnpm run typecheck`)
- ✅ Linter: 0 warnings, 0 errors (`pnpm run lint`)
- ✅ Tests: 84/84 passing (`pnpm test`)

---

## Test Strategy

### Unit Tests

Focus on isolated behavior of Open-Meteo fetch layer:

- Input/output transformation (ISO timestamps → Date objects)
- Timezone offset handling
- Error cases (missing data, API failures)
- Wave data merge logic

### Integration Tests

Focus on end-to-end provider routing:

- API handler selects correct provider based on model ID
- Fallback logic (Open-Meteo → Windguru, not reverse)
- Response headers (`x-data-source`, `x-fallback-used`)
- ICS calendar generation with Open-Meteo data

---

## Mock Data

### Open-Meteo Forecast Response

```typescript
{
  latitude: 32.08,
  longitude: 34.78,
  utc_offset_seconds: 10800, // UTC+3
  timezone: "Asia/Jerusalem",
  hourly: {
    time: ["2030-06-15T00:00", "2030-06-15T01:00", ...],
    wind_speed_10m: [5, 5, 5, 15, 15, 15, ...], // 15kn during daylight
    wind_direction_10m: [270, 270, 270, ...],
    wind_gusts_10m: [8, 8, 8, 20, 20, 20, ...],
  },
  daily: {
    time: ["2030-06-15"],
    sunrise: ["2030-06-15T05:30"],
    sunset: ["2030-06-15T19:50"],
  }
}
```

### Open-Meteo Marine Response

```typescript
{
  latitude: 32.08,
  longitude: 34.78,
  utc_offset_seconds: 10800,
  timezone: "Asia/Jerusalem",
  hourly: {
    time: ["2030-06-15T00:00", "2030-06-15T01:00", ...],
    wave_height: [1.2, 1.2, 1.2, ...],
  }
}
```

---

## Edge Cases Covered

1. **Timezone handling:**
   - Tests verify correct UTC conversion for UTC+2 and UTC+3 offsets
   - Ensures timestamps match between wind and wave data

2. **Partial data availability:**
   - Wave data may not cover all wind data timestamps
   - Merge only matching timestamps, leave others as `null`

3. **Non-fatal failures:**
   - Marine API failure doesn't block calendar generation
   - Wind data is returned without wave height

4. **Fallback scenarios:**
   - Open-Meteo fails → try Windguru equivalent model
   - Both fail → return 502 with structured error
   - Windguru selected → no fallback to Open-Meteo

5. **API validation errors:**
   - Open-Meteo returns `{ error: true, reason: "..." }` on 400
   - Still triggers fallback to Windguru

---

## Test Maintenance Notes

### Mock Data Management

- Mock data uses future date (2030-06-15) to avoid time-dependent test failures
- Sunrise/sunset times match expected daylight hours for Asia/Jerusalem in summer
- Wind speeds designed to pass/fail filters for specific test cases

### Mock Fetch Strategy

- `installFetchMock()` / `restoreFetch()` pattern used consistently
- Custom responders allow fine-grained control per test
- Default mocks return success paths, custom responders override for error tests

### Test Isolation

- Each test restores fetch mock in `finally` block
- No shared state between tests
- Mocks are scoped to individual test cases

---

## Coverage Gaps (Future Work)

The following scenarios are **not** currently tested:

1. **Open-Meteo timeout errors** (10s timeout)
2. **Network errors** (DNS failure, connection refused)
3. **Malformed JSON** from Open-Meteo
4. **Missing required fields** in response (e.g., no `hourly.time`)
5. **Very large responses** (168 hours = 7 days)
6. **Concurrent requests** with rate limiting

These are low priority as:

- The HTTP client reuses Windguru's `ApiError` pattern (already tested)
- Production monitoring will catch real-world edge cases
- Current coverage validates core logic and happy path

---

## Files Added

1. ✅ `tests/unit/open-meteo/forecast.test.ts` (301 lines, 9 tests)
2. ✅ `tests/integration/api/open-meteo.test.ts` (531 lines, 10 tests)

---

## Files Modified

1. ✅ `migration/MIGRATION_PLAN.md` - Marked task 13 as complete

---

## Summary

Added 19 new tests covering:

- Open-Meteo fetch layer (unit tests)
- Provider routing and fallback (integration tests)
- All 4 Open-Meteo models (`om_gfs`, `om_icon`, `om_gdps`, `om_ifs`)
- Edge cases: timezone offsets, wave data merge, non-fatal failures

**Test suite status:** 84/84 passing ✅  
**Build status:** TypeScript ✅ | Linter ✅ | Tests ✅

The migration is now **production-ready** with comprehensive test coverage validating both providers and the fallback strategy.
