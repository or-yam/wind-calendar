# 04: Preserve calendar state through filters, history, and rollover

**Status:** ready-for-agent

**Parent:** [Approved weekly sessions spec](../../../plans/017-weekly-sessions-ui.md). Read its implementation and testing decisions before starting.

**Blocked by:** [3: Navigate a three-day mobile calendar](03-mobile-navigation.md).

**What to build:** calendar preferences and navigation remain predictable while filters, browser history, background refresh, and the date change.

- [ ] Explicit Day preference survives filter updates, reload, and browser back/forward; malformed presentation state falls back safely.
- [ ] Presentation state stays out of forecast requests and subscription URLs; resizing alone does not fetch forecasts.
- [ ] Filter reset, Today, midnight/Sunday rollover, selected future week, and focus preservation retain the existing guarantees.
- [ ] App-level regression tests cover URL/network behavior; rendered calendar tests cover lifecycle/focus behavior with controlled time.
- [ ] Remove superseded state synchronization or effects introduced by earlier slices.

**Done when:** app-boundary tests demonstrate the behavior without mocking internal query or navigation collaborators.

## Visual references

- [Desktop week grid, including combined wind and waves](../../../output/design-exploration/weekly-sessions.html).
- [Mobile three-day and Day views](../../../output/design-exploration/mobile-sessions.html).

## Execution

Use the approved rendered-calendar boundary, the app boundary for URL/network behavior, and browser checks for visual layout. Work one failing behavior test → minimal implementation → passing test at a time. Include cleanup in this slice and keep shared components with live consumers. Preserve provider, API, subscription, and ICS behavior.
