# 05: Finish replacement, cleanup, and reference verification

**Status:** ready-for-agent

**Parent:** [Approved weekly sessions spec](../../../plans/017-weekly-sessions-ui.md). Read its implementation and testing decisions before starting.

**Blocked by:** [4: Preserve calendar state through filters, history, and rollover](04-state-and-rollover.md).

**What to build:** the calendar fully replaces the strip, matches the reviewed designs, and ships without abandoned UI code.

- [ ] Remove unused strip components, strip-only skeletons/helpers, horizontal scroll/snap effects, scrollbar rules, classes, labels, imports, and obsolete assertions. Retain shared primitives with live consumers.
- [ ] Search the application and tests for old strip references; every remaining reference is intentional and accounted for. Rename outdated test descriptions/files to match their public behavior.
- [ ] Preserve both reference mockups; remove temporary implementation/debug artifacts that are unnecessary for review.
- [ ] Browser checks pass at all four target widths, including keyboard access, details, overlap bounds, and resizing. Document intentional deviations from the references.
- [ ] After cleanup, focused tests, `pnpm check`, and `pnpm build` pass. Report unrelated failures explicitly rather than silently dropping coverage.

**Done when:** no obsolete strip UI remains, final checks run on the cleaned implementation, and screenshots support the claimed desktop/mobile behavior.

## Visual references

- [Desktop week grid, including combined wind and waves](../../../output/design-exploration/weekly-sessions.html).
- [Mobile three-day and Day views](../../../output/design-exploration/mobile-sessions.html).

## Execution

Use the approved rendered-calendar boundary, the app boundary for URL/network behavior, and browser checks for visual layout. Work one failing behavior test → minimal implementation → passing test at a time. Include cleanup in this slice and keep shared components with live consumers. Preserve provider, API, subscription, and ICS behavior.
