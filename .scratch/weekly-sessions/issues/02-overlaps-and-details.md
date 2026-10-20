# 02: Compare crowded sessions and inspect full details

**Status:** ready-for-agent

**Parent:** [Approved weekly sessions spec](../../../plans/017-weekly-sessions-ui.md). Read its implementation and testing decisions before starting.

**Blocked by:** [1: Read real sessions in a timed calendar](01-timed-calendar.md).

**What to build:** users can compare simultaneous sessions and inspect complete information using touch or keyboard.

- [ ] Nested/equal-start overlaps use readable parallel lanes; adjacent intervals do not overlap.
- [ ] Fractional hours, short blocks, cross-midnight/week segments, and sessions outside the default hourly range render correctly.
- [ ] Activation, close, independent wind/wave directions, session disappearance, and focus return work through public controls.
- [ ] Rendered tests protect details/content behavior; browser checks establish visual placement using worked fixtures.
- [ ] Replace temporary single-event assumptions from the first slice and remove any resulting unused presentation helpers.

**Done when:** the combined event and crowded Friday examples are verifiable with full accessible details and passing regression checks.

## Visual references

- [Desktop week grid, including combined wind and waves](../../../output/design-exploration/weekly-sessions.html).
- [Mobile three-day and Day views](../../../output/design-exploration/mobile-sessions.html).

## Execution

Use the approved rendered-calendar boundary, the app boundary for URL/network behavior, and browser checks for visual layout. Work one failing behavior test → minimal implementation → passing test at a time. Include cleanup in this slice and keep shared components with live consumers. Preserve provider, API, subscription, and ICS behavior.
