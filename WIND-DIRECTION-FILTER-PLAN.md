# Global Wind-Direction Filtering Plan

## Summary

Add one global wind-direction preference shared by every selected spot. Users can accept any subset of the eight existing cardinal directions:

`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`

The selected directions constrain wind matches only. Wave qualification remains independent. The same direction selection applies to every location before the existing multi-location winner selection runs.

Provider ingestion, forecast response serialization, forecast-card direction display, and calendar-event direction display already exist. The work is configuration, URL persistence, filtering, UI, free-text interpretation, and tests.

## Product Decision

Use a global 8-direction multi-select rather than a degree range or per-location configuration.

Reasons:

- It matches the cardinal directions already shown in forecast cards and calendar output.
- It handles ranges crossing north without special range semantics. Selecting `NW`, `N`, and `NE` is unambiguous.
- It keeps shared links and calendar subscription URLs readable.
- It avoids adding location-specific conditions to an already non-trivial multi-location result-selection pipeline.
- Eight sectors are precise enough for forecast filtering without implying accuracy the forecast models do not provide.

## Scope

### In Scope

- One accepted-direction selection shared by all selected locations.
- Eight meteorological wind directions, meaning the direction the wind comes from.
- Persistence in application, forecast, and calendar subscription URLs.
- Wind qualification based on both speed and direction.
- A visual and accessible direction selector in the wind configuration section.
- Free-text configuration support.
- Unit, component, and API/integration coverage.

### Out of Scope

- Different accepted directions per spot.
- Automatic spot-specific direction defaults.
- Onshore, offshore, cross-shore, or angle-relative-to-coast labels.
- Arbitrary degree ranges or a continuous circular range control.
- Wave- or swell-direction filtering.
- Direction-based ranking between locations after conditions qualify.
- Provider changes; both providers already supply direction in degrees.
- Changes to forecast-card or ICS direction display unless testing exposes an existing defect.

## Configuration Contract

Add this required field to `CalendarConfig`:

```ts
windDirections: WindDirection[];
```

Define the shared values and type from one source:

```ts
export const WIND_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type WindDirection = (typeof WIND_DIRECTIONS)[number];
```

Recommended location: a focused `shared/wind-directions.ts` module. It should also own `degreesToCardinal()` so display and filtering cannot drift into different sector definitions.

Validation rules:

- At least one direction is required.
- At most eight directions are allowed.
- Every value must be one of `WIND_DIRECTIONS`.
- Duplicate values are rejected.
- Input order has no behavioral meaning.
- URL serialization always uses `WIND_DIRECTIONS` order for stable query keys and URLs.

Default:

```ts
windDirections: [...WIND_DIRECTIONS];
```

All eight selected means unrestricted direction filtering. This is intentionally equivalent to current behavior.

Compatibility behavior:

- Existing application and subscribed calendar URLs do not contain `windDirections`; parsing them must default to all eight directions.
- When all eight are selected, a condition with `windDirection: null` continues to qualify based on wind speed. This avoids changing existing output merely because the new field was added.
- When a proper subset is selected, `windDirection: null` cannot prove a match and must fail wind qualification.

## Direction Semantics

Use the existing nearest-cardinal conversion:

```ts
WIND_DIRECTIONS[Math.round(degrees / 45) % 8];
```

This creates eight 45-degree sectors centered on the cardinal values. Examples:

| Degrees | Cardinal |
| ------: | -------- |
|       0 | N        |
|      45 | NE       |
|      90 | E        |
|     180 | S        |
|     270 | W        |
|     315 | NW       |
|     360 | N        |

Boundary behavior must be locked by tests, especially `22.5`, `337.5`, and the north wrap. Follow the current `Math.round` behavior rather than introducing a second interpretation.

## Qualification Rules

Direction is part of wind qualification, not a top-level filter:

```text
passesWind =
  windEnabled
  AND speed is present and within [windMin, windMax]
  AND direction passes

passesWave = existing wave rules, unchanged

condition qualifies = passesWind OR passesWave
```

Direction passes when either:

- all eight directions are selected, or
- direction is present and its cardinal sector is selected.

Behavior matrix:

| Wind speed | Direction    | Wind direction selection | Wave match | Result                                  |
| ---------- | ------------ | ------------------------ | ---------- | --------------------------------------- |
| Pass       | Selected     | Subset                   | No         | Wind match                              |
| Pass       | Not selected | Subset                   | No         | Excluded                                |
| Pass       | Missing      | Subset                   | No         | Excluded                                |
| Pass       | Missing      | All                      | No         | Wind match, preserving current behavior |
| Fail       | Any          | Any                      | Yes        | Wave match                              |
| Pass       | Not selected | Subset                   | Yes        | Wave match                              |
| Pass       | Selected     | Subset                   | Yes        | Both match                              |

The existing session grouping behavior remains unchanged. Hours filtered out by direction naturally create gaps; gaps larger than the existing threshold split sessions, and `minSessionHours` is applied afterward.

## Multi-Location Behavior

The global filter is applied independently to each location in `buildLocationSessions()` before `selectBestLocationSessions()` compares candidates.

```text
global config
    |
    +--> location A forecast --> speed/direction/wave filter --+
    |                                                       |
    +--> location B forecast --> speed/direction/wave filter --+--> existing winner selection
    |                                                       |
    +--> location C forecast --> speed/direction/wave filter --+
```

Consequences:

- A location with a stronger but rejected direction is not a candidate for that interval.
- Existing winner ranking by wind speed, wave height, and configured location order remains unchanged.
- Direction is a qualification rule only; it does not rank one accepted direction above another.
- The UI must state that the direction choice applies to all selected spots.

## Implementation Areas

### 1. Shared Direction Domain

Files:

- Add `shared/wind-directions.ts`.
- Update `shared/calendar-config-schema.ts`.
- Update `shared/constants.ts`.
- Update `shared/types.ts` if re-exporting `WindDirection` improves call sites.
- Update `server/utils/groupSessions.ts` and `server/api/forecast.ts` imports after extracting `degreesToCardinal()`.

Changes:

- Define the ordered direction tuple and `WindDirection` type.
- Move or delegate the existing `degreesToCardinal()` implementation to the shared module.
- Add `windDirections` to the strict Zod schema.
- Add duplicate validation with a clear error path and message.
- Add all eight directions to `DEFAULTS` without mutating the readonly constant at call sites.

Constraints:

- Keep a single cardinal conversion function for filtering, grouping, and API serialization.
- Follow `.js` import-extension conventions in server files.
- Do not add a package for circular math or selection state.

### 2. Server Query Parsing

Files:

- Update `server/config.ts`.

Query contract:

```text
windDirections=NW,N,NE
```

Parsing behavior:

- Missing parameter returns all eight defaults.
- Split one comma-separated parameter.
- Trim values.
- Reject empty values, unknown values, duplicates, and an empty final selection.
- Return typed `WindDirection[]`.
- Accept values in any order; behavior is set-based.

Error examples:

```text
Invalid windDirections: "NORTH"
windDirections must contain at least one direction
windDirections must not contain duplicates
```

Do not silently discard invalid directions in the API parser. A malformed calendar subscription URL should return `400`, consistent with other invalid configuration.

### 3. URL Serialization and Browser Parsing

Files:

- Update `src/lib/subscribe-urls.ts`.
- Update `src/App.tsx`.

Serialization behavior:

- Include `windDirections` whenever wind is enabled.
- Serialize in canonical `WIND_DIRECTIONS` order, regardless of click or input order.
- Continue using the same `buildConfigParams()` output for forecast query identity, page URL state, and subscription links.

Browser parsing behavior:

- Parse the same comma-separated format as the server.
- Missing input defaults to all directions.
- Let `calendarConfigSchema.safeParse()` reject malformed or empty selections.
- Preserve the current fallback behavior for an invalid overall page configuration.

Canonical ordering prevents equivalent selections such as `N,NE` and `NE,N` from producing different React Query cache keys, navigation reset keys, and subscription URLs.

When wind is disabled, omitting `windDirections` from the generated URL is acceptable because it does not affect a wave-only subscription. Reloading such a URL restores the unrestricted default if wind is later re-enabled.

### 4. Backend Filtering

Files:

- Update `server/utils/filterEvents.ts`.
- Update `server/utils/location-sessions.ts`.

Changes:

- Add `windDirections` to `FilterConfig`.
- Pass `config.windDirections` from `buildLocationSessions()`.
- Build a set once per `filterEvents()` invocation rather than once per condition.
- Detect the unrestricted all-eight case once.
- Add direction qualification to `passesWind`.
- Leave `passesWave`, match reasons, grouping, and location winner selection unchanged.

Avoid filtering the event before calculating `passesWave`. A rejected wind direction must not remove a valid wave-only hour in mixed mode.

### 5. Frontend State and Props

Files:

- Update `src/App.tsx`.
- Update `src/components/Hero.tsx`.
- Update `src/components/ConfigForm.tsx`.

Changes:

- Add `windDirections` to the parsed and live `CalendarConfig` state.
- Pass the value and `onWindDirectionsChange` through `Hero` to `ConfigForm`.
- Update state immutably.
- Keep selection order canonical when toggling directions.
- Do not add separate local state unless interaction performance demonstrates a real need; eight buttons can update config directly.

The forecast query will refetch when direction selection changes because the complete config is already part of the query key.

### 6. Direction Selector UX

Files:

- Update `src/components/ConfigForm.tsx`.
- Optionally add a focused component if the form would become harder to read or exceed the project's preferred file size materially.
- Use `wind-direction-picker-draft.html` as the visual reference for the compass layout, inward-pointing arrows, and selected/unselected treatment.

The standalone draft is intentionally oversized for design review. The production picker must be substantially smaller and fit naturally below the existing wind-speed slider without dominating the wind section. Preserve accessible touch targets while reducing arrow size, gaps, surrounding padding, and supporting copy.

Recommended interaction:

- Place the selector below the wind-speed slider while wind is enabled.
- Use a `fieldset` with a visible `legend`, such as `Accepted directions`.
- Render eight native `button type="button"` controls in a compact compass-like layout or a wrapping direction ring.
- Use `aria-pressed` to expose toggle state.
- Provide a clear `All` action that selects all eight directions.
- Prevent deselecting the final selected direction, or disable that last selected button until another is chosen.
- Use at least 44 by 44 pixel touch targets.
- Ensure selected state is not communicated by color alone.
- Keep native focus indicators visible.
- Add helper text: `Applies to all selected spots. Wind direction means where the wind comes from.`

Recommended labels:

| Value | Accessible label |
| ----- | ---------------- |
| N     | North            |
| NE    | Northeast        |
| E     | East             |
| SE    | Southeast        |
| S     | South            |
| SW    | Southwest        |
| W     | West             |
| NW    | Northwest        |

Do not use a conventional linear min/max slider. It handles north-crossing ranges poorly and makes disjoint accepted directions impossible.

### 7. Free-Text Configuration

Files:

- Update `server/free-text-config.ts`.
- Update interpret-config tests.

Changes:

- The strict output schema will require `windDirections`, so defaults and model instructions must include it before deployment.
- Explain that direction values are meteorological cardinal directions.
- Tell the model to preserve all eight directions when the user does not specify direction.
- Map phrases such as `northwest through northeast` to `NW`, `N`, `NE`.
- Do not infer safe directions from a spot name, sport, skill level, or equipment.
- Continue returning a complete configuration for every outcome.

### 8. Existing Direction Display

Verify rather than redesign:

- `server/api/forecast.ts` already returns cardinal and degree values for hourly wind.
- `src/components/ForecastCards.tsx` already displays session direction.
- `server/utils/generateIcsEvents.ts` already includes hourly wind direction.

No implementation change is expected here. Update the stale product-readiness checklist separately only if requested; it is documentation cleanup, not required for this feature.

## Test Coverage

### Shared Direction Tests

Add focused tests for `degreesToCardinal()` if extraction changes its test location:

- Exact cardinal values: `0`, `45`, `90`, `135`, `180`, `225`, `270`, `315`, `360`.
- Sector boundaries: immediately below, at, and immediately above `22.5` and `337.5`.
- North wrap behavior.
- Existing dominant-direction behavior remains unchanged.

### Schema and Server Config Tests

Update `tests/unit/config.test.ts` and model/schema tests:

- Missing parameter defaults to all eight.
- Valid subset parses.
- North-crossing subset `NW,N,NE` parses.
- Unknown direction returns an error.
- Empty selection returns an error.
- Duplicate direction returns an error.
- All eight values validate.
- `CalendarConfig` fixtures include `windDirections`.

### Filtering Tests

Update `tests/unit/utils/filterEvents.test.ts`:

- Selected direction with valid speed passes.
- Unselected direction with valid speed fails.
- Speed outside range still fails when direction passes.
- Null direction passes in unrestricted all-eight mode.
- Null direction fails for a subset.
- Degree values map through north correctly.
- A direction rejection does not remove a valid wave match.
- Match reason is `both` only when wind speed, wind direction, and wave rules all pass.
- Direction-filtered gaps interact correctly with session grouping in an integration-level test.

### URL Tests

Update `tests/unit/utils/subscribe-urls.test.ts`:

- Wind directions are serialized when wind is enabled.
- Serialization uses canonical order.
- Multiple directions round-trip through `URLSearchParams`.
- Existing config without a URL parameter receives defaults during parsing.
- Wave-only URL behavior remains unchanged.

### Component Tests

Update `tests/unit/components/ConfigForm.test.tsx` and relevant Hero tests:

- All directions render with accessible names.
- Current selections have `aria-pressed="true"`.
- Clicking an unselected direction selects it.
- Clicking a selected direction deselects it when at least one other remains.
- The final selected direction cannot be removed.
- `All` selects all eight.
- Selector is hidden or disabled consistently when wind is disabled.
- Helper text explains global multi-spot behavior.
- Callback values are emitted in canonical order.

### API and Pipeline Tests

Update forecast and calendar integration tests:

- `/api/forecast` excludes a wind-only hour with an unselected direction.
- `/api/forecast` retains a matching direction and returns its existing direction fields.
- `/api/calendar` excludes sessions that fail direction.
- A legacy URL with no `windDirections` produces existing behavior.
- Invalid direction input returns `400`.
- Multi-location selection considers only locations whose hourly conditions pass the global direction filter.
- Open-Meteo and Windguru fixtures both exercise direction filtering without provider-specific branches.

### Free-Text Tests

- Omitted direction produces all eight defaults.
- `northwest through northeast` produces `NW,N,NE`.
- Unsupported or insufficient outcomes still contain a complete valid config.
- The model is not expected to invent spot-safe defaults.

## Implementation Sequence

1. Introduce the shared direction domain and preserve existing cardinal conversion behavior.
2. Extend `CalendarConfig`, defaults, and all typed fixtures until the project typechecks.
3. Add server and browser query parsing plus canonical URL serialization.
4. Apply direction qualification in `filterEvents()` and pass configuration through the location pipeline.
5. Add the frontend selector and state/prop wiring.
6. Update free-text instructions and response coverage.
7. Add and update unit, component, and integration tests.
8. Run formatting, linting, typechecking, and the full test suite.
9. Manually verify desktop and mobile interactions and one generated calendar URL.

## Verification Commands

Run focused tests while implementing, then the full repository checks:

```sh
pnpm test tests/unit/config.test.ts
pnpm test tests/unit/utils/filterEvents.test.ts
pnpm test tests/unit/utils/subscribe-urls.test.ts
pnpm test tests/unit/components/ConfigForm.test.tsx
pnpm test tests/integration/api/forecast.test.ts
pnpm test tests/integration/api/calendar.test.ts
pnpm test tests/integration/api/calendar-validation.test.ts
pnpm check
```

Use `pnpm dev` with `agent-browser` for manual verification:

- Toggle individual directions using mouse and keyboard.
- Confirm the final selected direction cannot be removed.
- Confirm `All` restores unrestricted behavior.
- Confirm the URL updates and survives reload.
- Confirm a north-crossing selection remains `NW,N,NE` after reload.
- Confirm the selector is usable without horizontal overflow on a narrow mobile viewport.
- Confirm forecast sessions change as directions are selected and cleared.
- Confirm a generated calendar subscription URL contains the selected directions and returns valid ICS.

## Acceptance Criteria

- Users can select one or more of eight wind directions from the wind configuration UI.
- The control is keyboard accessible, touch-friendly, and understandable without relying only on color.
- One global selection clearly applies to every selected spot.
- Existing URLs without direction configuration retain current behavior.
- Direction selections persist through page reloads and calendar subscription links.
- Equivalent selections produce one canonical URL order.
- Wind-only qualification requires accepted speed and accepted direction when a subset is active.
- Wave-only qualification is unaffected by wind direction.
- North-crossing selections work without special cases in the configuration model.
- Null direction preserves current behavior only in unrestricted mode.
- Both Windguru and Open-Meteo data pass through the same filtering logic.
- Forecast cards and generated calendar events continue displaying direction.
- `pnpm check` passes.

## Risks and Mitigations

| Risk                                                  | Mitigation                                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| Users confuse wind-from and wind-toward direction     | State `where the wind comes from` beside the selector.                            |
| Existing subscriptions change behavior                | Missing parameter defaults to all; all bypasses direction filtering.              |
| UI and backend disagree on sectors                    | Share one ordered direction tuple and one conversion function.                    |
| Equivalent selections create duplicate cache keys     | Serialize selections in canonical compass order.                                  |
| Direction rejection accidentally removes wave matches | Apply direction only inside `passesWind`; add mixed-mode tests.                   |
| North wrap introduces range bugs                      | Represent discrete sectors, not a numeric min/max range.                          |
| Multi-location behavior is misunderstood              | State that one selection applies to all spots and filter before winner selection. |
| Free-text output starts failing strict validation     | Update defaults, schema instructions, and tests in the same change.               |

## Estimated Effort

Expected implementation effort: 1-2 focused engineering days.

Approximate distribution:

| Area                                                |  Estimate |
| --------------------------------------------------- | --------: |
| Shared contract, parsing, and URL handling          | 2-3 hours |
| Filtering and pipeline integration                  | 1-2 hours |
| Accessible frontend selector and responsive styling | 3-5 hours |
| Free-text support                                   |    1 hour |
| Tests and manual verification                       | 3-5 hours |

## Unresolved Questions

- None for the initial global implementation.
