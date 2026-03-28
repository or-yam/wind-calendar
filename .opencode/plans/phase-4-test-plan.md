# Phase 4 Test Implementation Plan

## Overview

This document details the test coverage needed for remaining untested modules in Phase 4.

**Estimated Total: ~121 tests across 7 modules**

---

## 1. `server/utils/timezone.ts`

**File:** `server/utils/timezone.ts`
**Existing Tests:** None

### Exported Functions

| Function                                            | Description                                                                                           |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `getLocalHour(date: Date, tz: string): number`      | Returns hour (0-23) in a given IANA timezone. Handles edge case where Intl returns "24" for midnight. |
| `toLocalTimeString(date: Date, tz: string): string` | Returns "HH:MM" in spot-local time using 24h format.                                                  |

### Test Cases (14 tests)

| Category           | Test                        | Expected                |
| ------------------ | --------------------------- | ----------------------- |
| **Happy Path**     | UTC timezone at noon        | Returns 12              |
|                    | America/New_York at 3pm EST | Returns 15              |
|                    | Asia/Tokyo at midnight JST  | Returns 0               |
|                    | Pacific/Honolulu at noon    | Returns 12              |
|                    | Midnight boundary (00:00)   | Returns 0               |
|                    | Noon boundary (12:00)       | Returns 12              |
| **Edge Cases**     | DST transition day          | Handles correctly       |
|                    | Hour 24 normalization       | Returns 0, not 24       |
|                    | Leap day Feb 29             | Works correctly         |
|                    | Year boundary Dec 31/Jan 1  | Works correctly         |
| **Error Handling** | Invalid timezone string     | Throws/returns fallback |
|                    | Invalid date object         | Throws/returns fallback |
|                    | Empty string timezone       | Throws/returns fallback |
| **Caching**        | Same timezone called twice  | Returns same formatter  |

---

## 2. `shared/models.ts`

**File:** `shared/models.ts`
**Existing Tests:** None

### Exported Functions

| Function                                                                           | Description                                                         |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `isValidModelId(id: number \| string): boolean`                                    | Type guard checking if ID exists in MODELS constant                 |
| `isWindguruModelId(id: ModelId): boolean`                                          | Type guard returning true for numeric Windguru IDs (3, 45, 59, 117) |
| `isOpenMeteoModelId(id: ModelId): boolean`                                         | Type guard returning true for string Open-Meteo IDs (om_gfs, etc.)  |
| `getProvider(modelId: ModelId): Provider`                                          | Returns "windguru" or "openmeteo" based on model ID                 |
| `getOpenMeteoSlug(modelId: OpenMeteoModelId): string`                              | Returns Open-Meteo API slug (e.g., "gfs_global")                    |
| `getWindguruFallback(openMeteoModelId: OpenMeteoModelId): WindguruModelId \| null` | Finds Windguru model with matching name as fallback                 |

### Test Cases (19 tests)

| Category           | Test                              | Expected                                                     |
| ------------------ | --------------------------------- | ------------------------------------------------------------ |
| **Happy Path**     | Valid Windguru ID 3               | isValidModelId returns true, getProvider returns "windguru"  |
|                    | Valid Windguru ID 45              | isValidModelId returns true                                  |
|                    | Valid Windguru ID 59              | isValidModelId returns true                                  |
|                    | Valid Windguru ID 117             | isValidModelId returns true                                  |
|                    | Valid Open-Meteo ID "om_gfs"      | isValidModelId returns true, getProvider returns "openmeteo" |
|                    | Valid Open-Meteo ID "om_icon"     | isValidModelId returns true                                  |
|                    | Valid Open-Meteo ID "om_gdps"     | isValidModelId returns true                                  |
|                    | Valid Open-Meteo ID "om_ifs"      | isValidModelId returns true                                  |
| **Edge Cases**     | Edge numeric ID 0, 1, 2           | Returns false                                                |
|                    | Invalid string with "om\_" prefix | Returns false                                                |
|                    | Model ID at boundary              | Correct behavior                                             |
| **Error Handling** | Invalid ID -999                   | Returns false                                                |
|                    | undefined ID                      | Returns false                                                |
|                    | null ID                           | Returns false                                                |
|                    | Empty string                      | Returns false                                                |
| **Fallback Logic** | om_gfs fallback                   | Returns correct Windguru model                               |
|                    | om_icon fallback                  | Returns correct Windguru model                               |
|                    | om_gdps fallback                  | Returns correct Windguru model                               |
|                    | om_ifs fallback                   | Returns correct Windguru model                               |

---

## 3. `server/open-meteo/config.ts`

**File:** `server/open-meteo/config.ts`
**Existing Tests:** None

### Exported Functions

| Function                                                                      | Description                                                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `parseOpenMeteoQueryParams(params: URLSearchParams): OpenMeteoCalendarConfig` | Parses and validates query params, throws on missing/invalid values             |
| `resolveOpenMeteoLocation(locationId: string): OpenMeteoLocation`             | Resolves location ID to coordinates, throws if not found or missing coordinates |

### Test Cases (16 tests)

| Category                                       | Test                                                  | Expected              |
| ---------------------------------------------- | ----------------------------------------------------- | --------------------- |
| **Happy Path**                                 | All valid params                                      | Returns config object |
|                                                | Default wind_min=14, wind_max=30, min_session_hours=2 | Uses defaults         |
|                                                | Valid location with coordinates                       | Returns location      |
| **Edge Cases**                                 | windMin=0                                             | Allowed               |
|                                                | windMax = windMin + 1                                 | Allowed               |
|                                                | minSessionHours=0                                     | Allowed               |
|                                                | Max safe integers                                     | Handled               |
|                                                | Location with coordinates at edge                     | Works                 |
| **Error Handling - parseOpenMeteoQueryParams** | Missing location                                      | Throws Error          |
|                                                | Missing model                                         | Throws Error          |
|                                                | Invalid model ID                                      | Throws Error          |
|                                                | wind_min negative                                     | Throws Error          |
|                                                | wind_max <= wind_min                                  | Throws Error          |
|                                                | NaN values                                            | Throws Error          |
|                                                | wave_height_min negative                              | Throws Error          |
| **Error Handling - resolveOpenMeteoLocation**  | Unknown location ID                                   | Throws Error          |
|                                                | Location without coordinates                          | Throws Error          |

---

## 4. `src/lib/date-utils.ts`

**File:** `src/lib/date-utils.ts`
**Existing Tests:** None (frontend)

### Exported Functions

| Function                                                  | Description                                          |
| --------------------------------------------------------- | ---------------------------------------------------- |
| `getWeekStart(date: Date, startOnSunday?: boolean): Date` | Returns start of week (Monday or Sunday) at midnight |
| `addDays(date: Date, days: number): Date`                 | Adds/subtracts days from date                        |
| `sameDay(a: Date, b: Date): boolean`                      | Checks if two dates are same calendar day            |
| `isToday(date: Date): boolean`                            | Checks if date is today                              |
| `formatWeekRange(weekStart: Date): string`                | Formats "Jan 1 – 7, 2026" style range                |
| `formatTime(hour: number, minute: number): string`        | Pads numbers to "HH:MM" string                       |
| `formatTimeFromDate(date: Date): string`                  | Extracts hours/minutes and formats as "HH:MM"        |
| `getDayNames(weekStartsOnSunday: boolean): string[]`      | Returns ["Sun", "Mon", ...] or ["Mon", "Tue", ...]   |

### Test Cases (18 tests)

| Category           | Test                            | Expected                |
| ------------------ | ------------------------------- | ----------------------- |
| **Happy Path**     | Monday start week               | Returns Monday          |
|                    | Sunday start week               | Returns Sunday          |
|                    | addDays positive                | Adds days               |
|                    | addDays negative                | Subtracts days          |
|                    | sameDay same date               | Returns true            |
|                    | sameDay different dates         | Returns false           |
|                    | formatWeekRange within month    | "Mar 29 – Apr 4, 2026"  |
|                    | formatTime normal values        | "09:30"                 |
| **Edge Cases**     | DST transition                  | Handled correctly       |
|                    | Week spanning year boundary     | "Dec 29 – Jan 4, 2026"  |
|                    | Week spanning month boundary    | "Mar 29 – Apr 4, 2026"  |
|                    | addDays at month end Jan 31 + 1 | Returns Feb 1           |
|                    | addDays at leap day             | Works correctly         |
|                    | isToday edge at midnight        | Works correctly         |
| **Error Handling** | Invalid date object             | Throws/returns fallback |
|                    | NaN in addDays                  | Throws/returns fallback |
|                    | undefined date                  | Throws/returns fallback |
| **Boundary**       | getDayNames(true)               | ["Sun", "Mon", ...]     |
|                    | getDayNames(false)              | ["Mon", "Tue", ...]     |

---

## 5. `src/lib/wind-colors.ts`

**File:** `src/lib/wind-colors.ts`
**Existing Tests:** None

### Exported Functions

| Function                               | Description                                                         |
| -------------------------------------- | ------------------------------------------------------------------- |
| `windColor(knots: number): string`     | Returns hex color for wind speed using Beaufort-like scale stops    |
| `windTextColor(knots: number): string` | Returns dark or light text color based on contrast threshold (20kn) |

### Test Cases (21 tests)

| Category           | Test                      | Expected                    |
| ------------------ | ------------------------- | --------------------------- |
| **Happy Path**     | 0 knots                   | Returns color for calm      |
|                    | 5 knots                   | Returns light breeze color  |
|                    | 10 knots                  | Returns moderate color      |
|                    | 15 knots                  | Returns fresh color         |
|                    | 20 knots                  | Returns strong color        |
|                    | 25 knots                  | Returns near gale color     |
|                    | 30 knots                  | Returns gale color          |
|                    | 40 knots                  | Returns storm color         |
|                    | 50 knots                  | Returns violent storm color |
|                    | 70 knots                  | Returns hurricane color     |
|                    | Between stops (7.5 knots) | Returns interpolated color  |
|                    | Text color below 20kn     | Returns dark text           |
|                    | Text color above 20kn     | Returns light text          |
| **Edge Cases**     | Negative knots            | Returns fallback color      |
|                    | Zero                      | Returns calm color          |
|                    | Fractional (0.5)          | Works correctly             |
|                    | Very high (100+)          | Returns max color           |
|                    | Exactly 20kn              | Returns threshold color     |
| **Error Handling** | NaN knots                 | Returns fallback            |
|                    | Infinity                  | Returns fallback            |
|                    | undefined                 | Returns fallback            |
| **Color Format**   | Verify hex format         | Returns "#RRGGBB"           |

---

## 6. `src/lib/subscribe-urls.ts`

**File:** `src/lib/subscribe-urls.ts`
**Existing Tests:** None

### Exported Functions

| Function                                                         | Description                        |
| ---------------------------------------------------------------- | ---------------------------------- |
| `buildConfigParams(config: CalendarConfig): URLSearchParams`     | Converts config to URLSearchParams |
| `buildApiUrl(config: CalendarConfig): string`                    | Returns `/api/calendar?params`     |
| `buildFullUrl(config: CalendarConfig, baseUrl?: string): string` | Returns full URL with origin       |
| `buildWebcalUrl(config: CalendarConfig): string`                 | Returns webcal:// URL              |
| `buildGoogleCalendarUrl(config: CalendarConfig): string`         | Returns Google Calendar URL        |
| `buildOutlookUrl(config: CalendarConfig): string`                | Returns Outlook Web URL            |

### Test Cases (15 tests)

| Category             | Test                           | Expected              |
| -------------------- | ------------------------------ | --------------------- |
| **Happy Path**       | Full config with all fields    | Returns valid URLs    |
|                      | waveEnabled=false              | No wave params in URL |
|                      | waveEnabled=true               | Includes wave params  |
|                      | All URL schemes correct        | webcal://, https://   |
| **Edge Cases**       | Config with default values     | Uses defaults         |
|                      | Model as number vs string      | Both work             |
|                      | Special characters in location | URL encoded           |
|                      | Very long parameter values     | Works                 |
| **Error Handling**   | Missing required fields        | Throws                |
|                      | Invalid model type             | Throws                |
|                      | undefined config               | Throws                |
| **URL Verification** | webcal:// protocol             | Correct replacement   |
|                      | Google CID encoding            | Correct encoding      |
|                      | Outlook URL encoding           | Correct encoding      |
|                      | baseUrl override               | Uses custom base      |

---

## 7. `server/utils/generateIcsEvents.ts`

**File:** `server/utils/generateIcsEvents.ts`
**Existing Tests:** `tests/unit/utils/generateIcsEvents.test.ts` (18 tests)

### Exported Functions

| Function                                                                        | Description                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------- |
| `dateToTuple(date: Date, tz: string): [number, number, number, number, number]` | Converts Date to [year, month, day, hour, minute] |
| `generateIcsEvents(sessions: Session[], tz: string): string`                    | Generates full ICS calendar string                |

### Test Cases (18 tests - already exist!)

**Note:** Tests already exist in `tests/unit/utils/generateIcsEvents.test.ts`. Verify they cover:

| Category                     | Coverage |
| ---------------------------- | -------- |
| Single session with wind     | ✓        |
| Single session with wave     | ✓        |
| Session with both            | ✓        |
| Multiple sessions            | ✓        |
| Session matchType variations | ✓        |
| ICS format validation        | ✓        |
| Empty sessions array         | ✓        |
| Error handling               | ✓        |

---

## Implementation Order

1. **timezone.ts** - 14 tests (server, pure functions)
2. **models.ts** - 19 tests (shared, pure functions)
3. **open-meteo/config.ts** - 16 tests (server, needs mocking)
4. **date-utils.ts** - 18 tests (frontend, needs jsdom)
5. **wind-colors.ts** - 21 tests (frontend, pure functions)
6. **subscribe-urls.ts** - 15 tests (frontend, pure functions)
7. **generateIcsEvents.ts** - Already done (18 tests)

---

## Test File Locations

```
tests/
├── unit/
│   ├── utils/
│   │   ├── rate-limit.test.ts        # ✅ Done (15 tests)
│   │   ├── timezone.test.ts          # ⏳ To do (14 tests)
│   │   ├── date-utils.test.ts        # ⏳ To do (18 tests)
│   │   ├── wind-colors.test.ts       # ⏳ To do (21 tests)
│   │   └── subscribe-urls.test.ts    # ⏳ To do (15 tests)
│   ├── models/
│   │   └── models.test.ts            # ⏳ To do (19 tests)
│   └── open-meteo/
│       └── config.test.ts             # ⏳ To do (16 tests)
└── integration/
    ├── api/
    │   ├── calendar.test.ts           # ✅ Done
    │   └── forecast.test.ts            # ✅ Done
    └── utils/
        └── generateIcsEvents.test.ts   # ✅ Done (18 tests)
```

---

## Notes

- Frontend tests (`src/lib/*`) need Vitest with jsdom/happy-dom for DOM APIs
- Some functions may need mocking (e.g., `ics` library in generateIcsEvents)
- Consider using `import.meta.env` mocking for baseUrl tests
- Timezone tests may behave differently across systems - use fixed dates
