# 03: Navigate a three-day mobile calendar

**Status:** ready-for-agent

**Parent:** [Approved weekly sessions spec](../../../plans/017-weekly-sessions-ui.md). Read its implementation and testing decisions before starting.

**Blocked by:** [2: Compare crowded sessions and inspect full details](02-overlaps-and-details.md).

**What to build:** mobile readers get the approved three-day layout, week strip, Day option, and range navigation, including crowded forecasts.

- [ ] Initial range, date selection, week-end clamping, boundary arrows, Today, and Day switching follow the decisions above.
- [ ] Selected date survives desktop/mobile transitions; details remain when their session stays visible.
- [ ] At 320px and 390px, essential content and controls fit without horizontal scrolling, including both badges on the combined example.
- [ ] Rendered navigation/accessibility tests pass; browser checks cover range changes, crowded Day mode, and resize.
- [ ] Replace the temporary mobile fallback from the first slice; remove its unused controls/styles.

**Done when:** the mobile reference can be exercised with real fixtures, and desktop remains functional after resizing in both directions.

## Visual references

- [Desktop week grid, including combined wind and waves](../../../output/design-exploration/weekly-sessions.html).
- [Mobile three-day and Day views](../../../output/design-exploration/mobile-sessions.html).

## Execution

Use the approved rendered-calendar boundary, the app boundary for URL/network behavior, and browser checks for visual layout. Work one failing behavior test → minimal implementation → passing test at a time. Include cleanup in this slice and keep shared components with live consumers. Preserve provider, API, subscription, and ICS behavior.
