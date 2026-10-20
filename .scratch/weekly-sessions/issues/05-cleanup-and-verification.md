# 05: Finish replacement, cleanup, and reference verification

**Status:** complete locally; independent Sol review and Vercel preview QA pending

**Parent:** [Approved weekly sessions spec](../../../plans/017-weekly-sessions-ui.md). Read its implementation and testing decisions before starting.

**Blocked by:** [4: Preserve calendar state through filters, history, and rollover](04-state-and-rollover.md).

**What to build:** the calendar fully replaces the strip, matches the reviewed designs, and ships without abandoned UI code.

- [x] Remove unused strip components, strip-only skeletons/helpers, horizontal scroll/snap effects, scrollbar rules, classes, labels, imports, and obsolete assertions. Retain shared primitives with live consumers.
- [x] Search the application and tests for old strip references; every remaining reference is intentional and accounted for. Rename outdated test descriptions/files to match their public behavior.
- [x] Preserve both reference mockups; remove temporary implementation/debug artifacts that are unnecessary for review.
- [x] Browser checks pass at all four target widths, including keyboard access, details, overlap bounds, and resizing. Document intentional deviations from the references.
- [x] After cleanup, focused tests, `pnpm check`, and `pnpm build` pass. Report unrelated failures explicitly rather than silently dropping coverage.

**Local evidence:** [browser checks and deviations](../evidence/ticket05/browser-checks.md). All four viewport screenshots and selected-session detail screenshots are in that evidence directory. Browser checks used the ticket 02 fixture at the fetch boundary for repeatability; the initial local Vite session returned 404 for API routes. Parent Vercel preview QA remains pending.

**Done when:** no obsolete strip UI remains, final checks run on the cleaned implementation, and screenshots support the claimed desktop/mobile behavior.

## Visual references

- [Desktop week grid, including combined wind and waves](../../../output/design-exploration/weekly-sessions.html).
- [Mobile three-day and Day views](../../../output/design-exploration/mobile-sessions.html).

## Execution

Use the approved rendered-calendar boundary, the app boundary for URL/network behavior, and browser checks for visual layout. Work one failing behavior test → minimal implementation → passing test at a time. Include cleanup in this slice and keep shared components with live consumers. Preserve provider, API, subscription, and ICS behavior.
