# Wave Forecast Feature — Plan

Add wave/surf forecast options so users can build calendars based on wind AND/OR wave preferences.
Same spots, same providers. Surfers and windsurfers served from one app.

---

## Architecture

### Current

```
fetchForecast ──▶ wind_speed, wind_dir, wind_gusts ──┐
                                                      ├──▶ filterEvents (AND) ──▶ groupSessions ──▶ ICS
fetchMarine ───▶ wave_height (only!) ────────────────┘
```

- `waveHeightMin` exists (0.4 default) but is NOT in the UI
- Filter logic: all conditions AND'd — wind range + daylight + wave min
- Wave data is non-fatal (null passes the filter)

### Proposed

```
fetchForecast ──▶ wind_speed, wind_dir, wind_gusts ──┐
                                                      │   ┌──────────────────┐
                                                      ├──▶│ filterEvents     │──▶ groupSessions ──▶ ICS
fetchMarine ───▶ wave_height                          │   │ Wind  ◀─OR─▶ Wave│
                 wave_period                   ───────┘   └──────────────────┘
                 wave_direction
                 swell_wave_height
                 swell_wave_period
                 swell_wave_direction
```

User picks: wind-only / wave-only / mix (OR logic between the two groups).

---

## Affected Files

| File                                         | Change                                            |
| -------------------------------------------- | ------------------------------------------------- |
| `server/types/wind-conditions.ts`            | Add wave fields to `WindConditionRaw`             |
| `server/open-meteo/types.ts`                 | Expand `OpenMeteoMarineResponse` hourly fields    |
| `server/open-meteo/fetch.ts`                 | Request more marine variables                     |
| `server/open-meteo/forecast.ts`              | Merge all new marine fields in `mergeWaveData()`  |
| `shared/types.ts`                            | Expand `CalendarConfig` with wave prefs           |
| `shared/constants.ts`                        | Add wave defaults                                 |
| `server/utils/filterEvents.ts`               | OR logic between wind/wave groups                 |
| `server/utils/groupSessions.ts`              | Expand `Session` with wave aggregates + matchType |
| `server/utils/generateIcsEvents.ts`          | Titles/descriptions based on matchType            |
| `server/config.ts`                           | Parse new query params                            |
| `api/calendar.ts`                            | Pass new config through pipeline                  |
| `src/App.tsx`                                | New config state, URL sync                        |
| `src/components/ConfigForm.tsx`              | Wind/wave toggle sections, wave sliders           |
| `src/lib/subscribe-urls.ts`                  | Include new params in URLs                        |
| `src/components/ForecastCards.tsx`           | Parse/display wave period, direction, match type  |
| `tests/unit/utils/filterEvents.test.ts`      | New tests for OR logic, wave-only mode            |
| `tests/unit/utils/groupSessions.test.ts`     | New tests for wave aggregates                     |
| `tests/unit/utils/generateIcsEvents.test.ts` | New tests for wave titles                         |
| `tests/unit/config.test.ts`                  | New tests for wave param parsing                  |

---

## Data Model Changes

### WindConditionRaw (server/types/wind-conditions.ts)

```
Current:                         Add:
  date: Date                       wavePeriod: number | null      // seconds
  windSpeed: number | null         waveDirection: number | null   // degrees
  windGusts: number | null         swellHeight: number | null     // meters
  windDirection: number | null     swellPeriod: number | null     // seconds
  waveHeight: number | null        swellDirection: number | null  // degrees
```

### OpenMeteoMarineResponse (server/open-meteo/types.ts)

Add to `hourly`:

```typescript
wave_period: (number | null)[];
wave_direction: (number | null)[];
swell_wave_height: (number | null)[];
swell_wave_period: (number | null)[];
swell_wave_direction: (number | null)[];
```

### CalendarConfig (shared/types.ts)

```typescript
interface CalendarConfig {
  location: string;
  model: number | string;
  minSessionHours: number;

  // Wind
  windEnabled: boolean; // default: true
  windMin: number; // default: 14
  windMax: number; // default: 35

  // Waves
  waveEnabled: boolean; // default: false
  waveSource: "total" | "swell"; // default: "total"
  waveHeightMin: number; // default: 0.5
  waveHeightMax: number; // default: 5.0
  wavePeriodMin: number; // default: 8
}
```

### DEFAULTS (shared/constants.ts)

```typescript
export const DEFAULTS = {
  windMin: 14,
  windMax: 35,
  minSessionHours: 2,
  model: 3,
  windEnabled: true,
  waveEnabled: false,
  waveSource: "total" as const,
  waveHeightMin: 0.5,
  waveHeightMax: 5.0,
  wavePeriodMin: 8,
} as const;
```

### Session (server/utils/groupSessions.ts)

Add to existing:

```typescript
wavePeriodAvg: number; // 0 if no wave data
waveDominantDirection: string; // "N" if no wave data
swellHeightAvg: number;
swellPeriodAvg: number;
matchType: "wind" | "wave" | "both";
```

---

## Filter Logic (server/utils/filterEvents.ts)

Current: single AND chain.
New: OR between wind and wave qualification groups.

```
FilterConfig gains:
  windEnabled: boolean
  waveEnabled: boolean
  waveSource: "total" | "swell"
  waveHeightMax: number
  wavePeriodMin: number

Per hourly data point:

  passesWind = windEnabled AND (
    windSpeed != null AND
    windSpeed >= windMin AND windSpeed <= windMax
  )

  // resolve wave values based on source
  height = waveSource === "swell" ? swellHeight : waveHeight
  period = waveSource === "swell" ? swellPeriod : wavePeriod

  passesWave = waveEnabled AND (
    height != null AND
    height >= waveHeightMin AND height <= waveHeightMax AND
    (period == null OR period >= wavePeriodMin)
  )

  include = (passesWind OR passesWave) AND daylight AND future
```

Each condition gets a `matchReason` tag:

- `"wind"` if passesWind && !passesWave
- `"wave"` if passesWave && !passesWind
- `"both"` if passesWind && passesWave

This tag flows through to `Session.matchType` (dominant reason in the session).

### Backward Compatibility

When `windEnabled=true` and `waveEnabled=false` (default), behavior is identical to today:

- Wind range filters apply
- Wave data ignored in filtering (but still shown in ICS if present)

---

## Marine API Call (server/open-meteo/fetch.ts)

Current request:

```
hourly=wave_height
```

New request:

```
hourly=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction
```

Same endpoint, same latency. One request, six variables.

---

## ICS Output (server/utils/generateIcsEvents.ts)

Title format based on `matchType`:

| matchType | Title example                    |
| --------- | -------------------------------- |
| `"wind"`  | `Wind 18-22kn NW`                |
| `"wave"`  | `Waves 1.5m 12s SW`              |
| `"both"`  | `Wind 18kn NW \| 1.5m 12s waves` |

Description: per-hourly breakdown includes wave data when available:

```
07:00  16kn gusts 22kn NW  waves 1.2m 10s
08:00  18kn gusts 24kn NW  waves 1.3m 11s
```

Calendar name: change from `"Wind Forecast"` to `"Forecast"` (or keep dynamic based on mode).

---

## URL Params (backward compatible)

All new params optional. Missing = default value.

```
Existing (unchanged):
  ?location=beit-yanai&windMin=14&windMax=35&minSessionHours=2&model=om_gfs

New:
  &windEnabled=true          (default: true)
  &waveEnabled=false         (default: false)
  &waveSource=total          (default: "total", alt: "swell")
  &waveHeightMin=0.5         (default: 0.5)
  &waveHeightMax=5.0         (default: 5.0)
  &wavePeriodMin=8           (default: 8)
```

Example presets:

- Wind surfer: `?windEnabled=true&waveEnabled=false&windMin=14&windMax=35`
- Surfer: `?windEnabled=false&waveEnabled=true&waveHeightMin=1&wavePeriodMin=10`
- Mix: `?windEnabled=true&waveEnabled=true&windMin=14&waveHeightMin=0.8`

---

## UI (src/components/ConfigForm.tsx)

```
┌──────────────────────────────────┐
│ Spot: [Beit Yanai ▾]            │
│ Model: [GFS ▾]                  │
│ Min Session: [───●──── 2 hrs]   │
├──────────────────────────────────┤
│ [✓] Wind                        │  ← toggle (checkbox or switch)
│   Range: [──●────────●──] 14-35 kn│
├──────────────────────────────────┤
│ [ ] Waves                        │  ← toggle, collapsed when off
│   Source: ( Total ) ( Swell )    │  ← radio or segmented control
│   Height: [──●────────●──] 0.5-5m│
│   Min Period: [──●──────] 8 sec  │
└──────────────────────────────────┘
```

- At least one of wind/wave must be enabled (disable the other's toggle when one is the only active)
- Wave section collapsed/dimmed when disabled
- Wind section collapsed/dimmed when disabled

---

## ForecastCards (src/components/ForecastCards.tsx)

Currently parses wind/wave from ICS summary via regex. Needs to handle new title formats:

- `"Waves 1.5m 12s SW"` — wave-only cards get wave-themed styling (blue border instead of wind-color)
- `"Wind 18kn NW | 1.5m 12s waves"` — both indicators shown
- Show wave period badge alongside wave height badge

Card left-border color:

- Wind match: wind-color gradient (current behavior)
- Wave match: blue gradient based on wave height
- Both: wind-color (primary), wave badge shown

---

## Steps

### Phase 7A: Server — Data Layer

- [ ] 7.1 — Expand `WindConditionRaw` with: wavePeriod, waveDirection, swellHeight, swellPeriod, swellDirection
- [ ] 7.2 — Expand `OpenMeteoMarineResponse` type with new hourly fields
- [ ] 7.3 — Update `fetchMarine()` to request all six marine variables
- [ ] 7.4 — Update `mergeWaveData()` to merge all new fields by timestamp

### Phase 7B: Server — Config & Parsing

- [ ] 7.5 — Expand `CalendarConfig` with: windEnabled, waveEnabled, waveSource, waveHeightMax, wavePeriodMin
- [ ] 7.6 — Update `DEFAULTS` in constants.ts
- [ ] 7.7 — Update `parseQueryParams()` in server/config.ts — parse + validate new params
- [ ] 7.8 — Update `parseUrlParams()` in App.tsx client-side to match

### Phase 7C: Server — Pipeline

- [ ] 7.9 — Update `filterEvents()` — OR logic, match reason tracking per data point
- [ ] 7.10 — Expand `Session` type with wave aggregates + matchType
- [ ] 7.11 — Update `groupSessions()` — compute wavePeriodAvg, waveDominantDirection, swellHeightAvg, swellPeriodAvg, matchType
- [ ] 7.12 — Update `generateIcsEvents()` — titles/descriptions per matchType
- [ ] 7.13 — Update `buildCalendar()` in api/calendar.ts — pass new config fields to filterEvents

### Phase 7D: Client — UI

- [ ] 7.14 — Update `ConfigForm.tsx` — wind/wave toggles, wave source picker, wave range + period sliders
- [ ] 7.15 — Update `App.tsx` — new state fields, URL param sync, handlers
- [ ] 7.16 — Update `buildApiUrl()` + other URL builders in subscribe-urls.ts
- [ ] 7.17 — Update `ForecastCards.tsx` — parse new title formats, wave-themed card styling

### Phase 7E: Tests

- [ ] 7.18 — `filterEvents.test.ts` — wind-only, wave-only, mix OR logic, backward compat
- [ ] 7.19 — `groupSessions.test.ts` — wave aggregates, matchType computation
- [ ] 7.20 — `generateIcsEvents.test.ts` — new title formats per matchType
- [ ] 7.21 — `config.test.ts` — new param parsing, defaults, validation
- [ ] 7.22 — Run full test suite + build, fix any issues

---

## Unresolved Questions

1. **Wave direction filtering** — skip for v1? Direction ranges are complex UX (user must know spot orientation). Propose: fetch and display wave direction, but don't filter by it yet. Add as advanced option later.

2. **Windguru provider** — Windguru path doesn't fetch marine data. Options:
   - (a) Wave features Open-Meteo only — Windguru users see no wave data
   - (b) Always fetch marine from Open-Meteo regardless of wind provider
   - (c) Ignore for now, most users should be on Open-Meteo models anyway

3. **Cross-type session grouping** — If hour N qualifies for wind and hour N+1 for waves only, should they merge into one session? Proposed: yes, group them together — the user wants to know "something interesting is happening."

4. **Marine model** — Currently "best match" default. Keep it independent from wind model? Proposed: yes, always use best match for marine (simpler, and wave models don't map 1:1 to weather models).

5. **At least one toggle** — Must at least one of windEnabled/waveEnabled be true? Or allow neither (which returns empty calendar)? Proposed: enforce at least one in UI, but server accepts both-false gracefully (empty result).
