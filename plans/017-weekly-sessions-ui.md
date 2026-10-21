# Weekly upcoming sessions UI

Status: complete; all five implementation tickets, independent Sol review, and parent Vercel preview QA passed.

Planning sources: the main worktree's `to-spec`, `to-tickets`, `tdd`, and `writing-for-agents` skills. Work in complete, verifiable feature slices, with tests and cleanup inside each slice.

## Problem statement

The session strip makes users scroll through individual cards to compare days. Session durations and overlapping opportunities are difficult to compare, especially across locations. Mobile needs readable forecasts without squeezing seven columns onto a phone.

## Solution and approved references

Replace the strip with a weekly time grid in the existing theme. Show seven days on desktop and three days on mobile, with a single-day option for crowded schedules.

Use the mockups reviewed in this conversation:

- Desktop weekly calendar with a combined wind-and-wave event: **Week grid** is the reference. The alternative **Day columns** layout is out of scope.
- Mobile calendar: **3 days** is the default; **Day** is the alternative.

Sample forecasts, fixed colors, and restricted navigation in the mockups demonstrate appearance only; production uses real forecast data and existing color functions. Build native React components rather than embedding the HTML.

## User stories

1. As a forecast reader, I want to compare seven days on one time axis so I can identify suitable session windows.
2. As a mobile reader, I want three readable day columns so I can compare nearby opportunities without horizontal scrolling.
3. As a mobile reader, I want a single-day option so crowded forecasts remain usable.
4. As a reader, I want blocks positioned and sized by time so session timing and duration are apparent.
5. As a reader comparing locations, I want simultaneous sessions shown side by side so no opportunity is hidden behind another.
6. As a reader, I want wind, wave, and combined matches distinguished so I understand which conditions qualify.
7. As a reader of a combined match, I want both forecast badges and their own directions so I can assess both conditions.
8. As a reader, I want complete session details on activation so small blocks do not hide essential information.
9. As a reader, I want date controls and Today so I can move through the forecast and return to the current date.
10. As a returning reader, I want my explicit mobile Day preference retained through URL updates and browser navigation.
11. As a reader adjusting filters, I want the calendar to update using the existing forecast and subscription behavior.
12. As a reader, I want loading, errors, and no matches clearly distinguished so I know what the calendar is showing.
13. As a keyboard or screen-reader user, I want named controls, usable events, and predictable focus so the calendar is accessible.
14. As a reader leaving the page open, I want today and week boundaries to refresh without losing focus or a selected future week.
15. As a reader resizing the page, I want my selected date preserved so changing layout does not lose my place.

## Implementation decisions

- Preserve dark surfaces, condensed typography, the mint sticker heading, pink accents, and existing condition color functions. Use shared UI primitives and native browser capabilities; no calendar dependency or global state library.
- Replace the forecast strip with focused calendar, navigation, event, and detail components. Extract shared presentation only as the current slice needs it; keep files small.
- Desktop shows Sunday–Saturday inside the existing content width. Below an initial 768px breakpoint, show three days and the week strip; validate the actual transition in the browser.
- Keep one hourly scale for the selected week. Ordinary weeks use local clock hours from 06:00–20:00 and expand to include earlier/later sessions; empty weeks retain that range. When any local day in the selected week has an offset transition, use elapsed hours since each day's local midnight for every column, label the axis as elapsed hours, and show event/detail clocks with UTC offsets (including offset minutes). Transition-day columns can span 23 or 25 elapsed hours; segments are clipped to each local midnight and sized by elapsed duration. Add a short clock-change-week note. Source instants remain authoritative; ordinary weeks keep the existing local-clock axis.
- Sort sessions deterministically and arrange overlapping groups in parallel lanes. Touching endpoints do not overlap. Display cross-midnight sessions as day segments while details retain the original session and timestamps.
- Keep short blocks within their actual time boundaries. Prioritize location/time; expose omitted content through accessible names and details. The default three-day view must still show both badges on the combined example.
- Events show only applicable conditions according to match type. Combined matches show both badges and independently sourced wind/wave directions.
- Activation opens details below the grid. Closing returns focus when the event still exists. Close details when their session disappears or leaves the visible range; preserve them on resize when the session remains visible.
- Preserve existing week-navigation rules: Sunday start, current-week lower bound, Today, filter-change reset, future-week selection, and midnight/focus refresh without unsolicited focus changes.
- Mobile initially starts at today, clamped so three days fit within the selected week. A future week starts on Sunday. Selecting a date starts the range there, with the same end-of-week clamp. Day mode shows the selected date alone.
- Mobile arrows move by the visible day count; at a boundary they enter the adjacent week, respecting the current-week lower bound. Today returns to the current week and makes today visible.
- Preserve the selected date across mode changes and resize. Keep explicit Day preference in URL-backed presentation state, separate from forecast/subscription parameters, and preserve it when filters rewrite the URL. Layout changes alone do not refetch forecasts.
- Use native buttons and roughly 44px navigation targets. Announce loading, errors, and visible-range emptiness. Render calendar-shaped skeletons; show No match only after a successful response. Add a separate No forecast state only if the data can support that distinction.

## Testing decisions — approved boundaries

**Primary automated boundary: the rendered calendar through its public inputs and user controls.** Follow the existing rendered forecast component/navigation/accessibility suites. Exercise real date grouping, layout calculation, condition formatting, and event rendering together. Observe dates, event content, accessible names, navigation, and focus; do not test private helpers or component structure.

**Application boundary where needed:** render the app with a controlled forecast HTTP response to verify URL preference, filter updates, history navigation, and fetch counts. Keep the query/configuration integration real; fake external network responses and clock/viewport inputs only as required.

**Browser boundary for visual behavior:** use `agent-browser` against the app served through `portless`. Compare with both reviewed mockups at 320, 390, 768, and 1280px. Inspect actual event bounds, overlaps, text fit, touch controls, keyboard use, and resizing with details open. DOM-only tests do not establish visual correctness.

Use literal, worked forecast examples with independent expected dates and conditions. Cover nested overlaps, equal starts across locations, adjacent intervals, fractional hours, midnight/week boundaries, and clock rollover through these boundaries. Existing date/navigation tests remain where they protect public behavior; add no new private geometry testing boundary without agreement.

For each behavior: one failing test → minimal working implementation → passing test. Do not write all tests first or leave tests until the final ticket. Preserve still-valid regression assertions when replacing strip-specific tests. These boundaries were approved with this plan. Reconfirm only if proposing a new testing boundary.

## Approved tickets

Each ticket delivers working user behavior and fits a fresh implementation session. Work blockers-first; tests and removal of superseded code belong to each slice. Local execution tickets:

1. Read real sessions in a timed calendar
2. Compare crowded sessions and inspect full details
3. Navigate a three-day mobile calendar
4. Preserve calendar state through filters, history, and rollover
5. Finish replacement, cleanup, and reference verification

### 1. Read real sessions in a timed calendar

**Blocked by:** None.

**Delivers:** users can read actual wind-only, wave-only, and combined sessions in a seven-day desktop grid, with a usable single-day fallback on mobile.

- [x] Week dates, hourly placement, duration, condition badges/directions, and timezone are correct for ordinary non-overlapping sessions.
- [x] Previous/next week, Today, filter reset, loading, error, and empty-day behavior work through the integrated page.
- [x] A combined session shows both badges, following the desktop reference.
- [x] Rendered behavior tests cover real session data, match types, navigation, and request states; the slice passes its focused checks.
- [x] Replace the strip entry component and loading UI, update consumers/test imports, and remove the replaced strip rendering and scroll-to-today behavior in the same slice.

**Done when:** real forecast fixtures can be demonstrated in the app at desktop and phone widths, with passing behavior tests and no old strip path still rendered.

### 2. Compare crowded sessions and inspect full details

**Blocked by:** 1 — Read real sessions in a timed calendar.

**Delivers:** users can compare simultaneous sessions and inspect complete information using touch or keyboard.

- [x] Nested/equal-start overlaps use readable parallel lanes; adjacent intervals do not overlap.
- [x] Fractional hours, short blocks, cross-midnight/week segments, and sessions outside the default hourly range render correctly.
- [x] Activation, close, independent wind/wave directions, session disappearance, and focus return work through public controls.
- [x] Rendered tests protect details/content behavior; browser checks establish visual placement using worked fixtures.
- [x] Replace temporary single-event assumptions from the first slice and remove any resulting unused presentation helpers.

**Done when:** the combined event and crowded Friday examples are verifiable with full accessible details and passing regression checks.

### 3. Navigate a three-day mobile calendar

**Blocked by:** 2 — Compare crowded sessions and inspect full details.

**Delivers:** mobile readers get the approved three-day layout, week strip, Day option, and range navigation, including crowded forecasts.

- [x] Initial range, date selection, week-end clamping, boundary arrows, Today, and Day switching follow the decisions above.
- [x] Selected date survives desktop/mobile transitions; details remain when their session stays visible.
- [x] At 320px and 390px, essential content and controls fit without horizontal scrolling, including both badges on the combined example.
- [x] Rendered navigation/accessibility tests pass; browser checks cover range changes, crowded Day mode, and resize.
- [x] Replace the temporary mobile fallback from the first slice; remove its unused controls/styles.

**Done when:** the mobile reference can be exercised with real fixtures, and desktop remains functional after resizing in both directions.

### 4. Preserve calendar state through filters, history, and rollover

**Blocked by:** 3 — Navigate a three-day mobile calendar.

**Delivers:** calendar preferences and navigation remain predictable while filters, browser history, background refresh, and the date change.

- [x] Explicit Day preference survives filter updates, reload, and browser back/forward; malformed presentation state falls back safely.
- [x] Presentation state stays out of forecast requests and subscription URLs; resizing alone does not fetch forecasts.
- [x] Filter reset, Today, midnight/Sunday rollover, selected future week, and focus preservation retain the existing guarantees.
- [x] App-level regression tests cover URL/network behavior; rendered calendar tests cover lifecycle/focus behavior with controlled time.
- [x] Remove superseded state synchronization or effects introduced by earlier slices.

**Done when:** app-boundary tests demonstrate the behavior without mocking internal query or navigation collaborators.

### 5. Finish replacement, cleanup, and reference verification

**Blocked by:** 4 — Preserve calendar state through filters, history, and rollover.

**Delivers:** the calendar fully replaces the strip, matches the reviewed designs, and ships without abandoned UI code.

- [x] Remove unused strip components, strip-only skeletons/helpers, horizontal scroll/snap effects, scrollbar rules, classes, labels, imports, and obsolete assertions. Retain shared primitives with live consumers.
- [x] Search the application and tests for old strip references; every remaining reference is intentional and accounted for. Rename outdated test descriptions/files to match their public behavior.
- [x] Preserve both reference mockups; remove temporary implementation/debug artifacts that are unnecessary for review.
- [x] Browser checks pass at all four target widths, including keyboard access, details, overlap bounds, and resizing. Document intentional deviations from the references.
- [x] After cleanup, focused tests, `pnpm check`, and `pnpm build` pass. Report unrelated failures explicitly rather than silently dropping coverage.

**Done when:** no obsolete strip UI remains, final checks run on the cleaned implementation, and screenshots support the claimed desktop/mobile behavior.

## Out of scope

Provider/API changes, session-selection rules, subscription or ICS changes, new calendar packages, desktop Day columns, drag/drop scheduling, and forecast states unsupported by the response data.

## Further notes

The frontend already has rendered forecast, navigation, accessibility, and app regression suites. Prefer those public boundaries over new private-helper suites. Existing obsolete tests encode the old strip structure; migrate their useful behavior assertions as each slice lands.

No external tracker configuration was found. Tickets are stored locally, one file per approved slice, with explicit blocking edges. No external issues were created. Run `/setup-matt-pocock-skills` if external tracker publication is wanted later.

## Unresolved questions

None.

## Review follow-up status (2026-10-20)

All local findings from the first standards/spec review round are implemented. Transition weeks use one elapsed-hours axis across all columns and offset-qualified local event/detail times. Calendar source and rendered tests are split into focused files under 100 lines. Browser bounds verify overlap lanes, adjacent intervals, fractional starts, overnight segments, and the 45-minute rollback fixture. `pnpm check` passes (58 suites / 613 tests); `pnpm build` passes. Independent Sol standards/spec reviews passed after the round 1 and round 2 corrections. Parent QA passed on the protected Vercel preview, including live APIs and controlled browser fixtures.
