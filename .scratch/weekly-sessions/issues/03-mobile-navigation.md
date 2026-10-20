# 03: Navigate a three-day mobile calendar

**Status:** complete

**Parent:** [Approved weekly sessions spec](../../../plans/017-weekly-sessions-ui.md). Read its implementation and testing decisions before starting.

**Blocked by:** [2: Compare crowded sessions and inspect full details](02-overlaps-and-details.md).

**What to build:** mobile readers get the approved three-day layout, week strip, Day option, and range navigation, including crowded forecasts.

- [x] Initial range, date selection, week-end clamping, boundary arrows, Today, and Day switching follow the decisions above.
- [x] Selected date survives desktop/mobile transitions; details remain when their session stays visible.
- [x] At 320px and 390px, essential content and controls fit without horizontal scrolling, including both badges on the combined example.
- [x] Rendered navigation/accessibility tests pass; browser checks cover range changes, crowded Day mode, and resize.
- [x] Replace the temporary mobile fallback from the first slice; remove its unused controls/styles.

**Done when:** the mobile reference can be exercised with real fixtures, and desktop remains functional after resizing in both directions.

## Visual references

- [Desktop week grid, including combined wind and waves](../../../output/design-exploration/weekly-sessions.html).
- [Mobile three-day and Day views](../../../output/design-exploration/mobile-sessions.html).

## Execution

Use the approved rendered-calendar boundary, the app boundary for URL/network behavior, and browser checks for visual layout. Work one failing behavior test → minimal implementation → passing test at a time. Include cleanup in this slice and keep shared components with live consumers. Preserve provider, API, subscription, and ICS behavior.

## Implementation evidence

- Replaced the temporary mobile day selector with the 3-day week view, seven date buttons, and Day view control.
- Added rendered navigation coverage for selecting a date, Day mode, range movement, and the current-week Sunday lower bound.
- Browser screenshots and viewport/resize notes: [ticket 03 evidence](../evidence/ticket03/browser-checks.md).
