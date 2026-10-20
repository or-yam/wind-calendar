# 04: Preserve calendar state through filters, history, and rollover

**Status:** complete

**Parent:** [Approved weekly sessions spec](../../../plans/017-weekly-sessions-ui.md). Read its implementation and testing decisions before starting.

**Blocked by:** [3: Navigate a three-day mobile calendar](03-mobile-navigation.md).

**What to build:** calendar preferences and navigation remain predictable while filters, browser history, background refresh, and the date change.

- [x] Explicit Day preference survives filter updates and reload; browser history restores the previous preference; malformed presentation state falls back safely.
- [x] Presentation state stays out of forecast requests and subscription URLs; resizing alone does not fetch forecasts.
- [x] Filter reset, Today, midnight/Sunday rollover, selected future week, and focus preservation retain the existing guarantees.
- [x] App-level regression tests cover URL/network behavior; rendered calendar tests cover lifecycle/focus behavior with controlled time.
- [x] Removed local Day-mode state when the app controls preference through URL state.

**Done when:** app-boundary tests demonstrate the behavior without mocking internal query or navigation collaborators.

## Visual references

- [Desktop week grid, including combined wind and waves](../../../output/design-exploration/weekly-sessions.html).
- [Mobile three-day and Day views](../../../output/design-exploration/mobile-sessions.html).

## Execution

Use the approved rendered-calendar boundary, the app boundary for URL/network behavior, and browser checks for visual layout. Work one failing behavior test → minimal implementation → passing test at a time. Include cleanup in this slice and keep shared components with live consumers. Preserve provider, API, subscription, and ICS behavior.

## Implementation evidence

- Added `calendarView=day` as presentation-only URL state. Mode changes add browser history entries; config URL rewrites preserve the mode, while forecast and subscription builders remain config-only.
- Added app-boundary coverage for malformed-state fallback, mode persistence through filter updates and reload, history restoration, URL exclusion from forecast/subscription requests, and no fetch on viewport resize.
- Filter changes reset the mobile day selection along with the existing week reset. Existing rendered tests continue to cover Today, midnight, focus, and future-week navigation.
