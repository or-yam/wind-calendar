# 01: Read real sessions in a timed calendar

**Status:** ready-for-agent

**Parent:** [Approved weekly sessions spec](../../../plans/017-weekly-sessions-ui.md). Read its implementation and testing decisions before starting.

**Blocked by:** None (can start immediately).

**What to build:** users can read actual wind-only, wave-only, and combined sessions in a seven-day desktop grid, with a usable single-day fallback on mobile.

- [ ] Week dates, hourly placement, duration, condition badges/directions, and timezone are correct for ordinary non-overlapping sessions.
- [ ] Previous/next week, Today, filter reset, loading, error, and empty-day behavior work through the integrated page.
- [ ] A combined session shows both badges, following the desktop reference.
- [ ] Rendered behavior tests cover real session data, match types, navigation, and request states; the slice passes its focused checks.
- [ ] Replace the strip entry component and loading UI, update consumers/test imports, and remove the replaced strip rendering and scroll-to-today behavior in the same slice.

**Done when:** real forecast fixtures can be demonstrated in the app at desktop and phone widths, with passing behavior tests and no old strip path still rendered.

## Visual references

- [Desktop week grid, including combined wind and waves](../../../output/design-exploration/weekly-sessions.html).
- [Mobile three-day and Day views](../../../output/design-exploration/mobile-sessions.html).

## Execution

Use the approved rendered-calendar boundary, the app boundary for URL/network behavior, and browser checks for visual layout. Work one failing behavior test → minimal implementation → passing test at a time. Include cleanup in this slice and keep shared components with live consumers. Preserve provider, API, subscription, and ICS behavior.
