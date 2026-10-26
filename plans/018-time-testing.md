# Portable time tests before production fixes

Status: test boundaries and sunset clipping approved on 2026-10-24. Tests/settings updated;
production fixes await test review. This draft PR deliberately leaves genuine regressions red.

## Agreed public boundaries

1. Exported calendar date helpers: local week/day/month/year arithmetic and frozen `isToday`.
2. `filterEvents`: exact admitted samples at sunrise, before sunset, at sunset, and around now.
3. Forecast/calendar HTTP responses: provider HTTP mocked, real Effect parser/filter/group/output
   pipeline, exact JSON timestamps and ICS boundaries. Preserve correct timestamp/marine matching.
4. Rendered calendar/navigation: local midnight, Sunday/year rollover, focus/visibility resume,
   and clock changes. Test the current calendar UI; do not resurrect elapsed-axis/offset labels
   removed by the calendar clock PR already on `main`.

No production changes or new production interfaces. Keep `pnpm test` as `vitest run`.
No custom runner, blanket fake timers, redundant config defaults, skips or expected-failure masks.

## Expected behavior

- Numeric local constructors represent calendar fixtures; explicit offsets/UTC identify instants.
- Sunrise is inclusive and sunset exclusive, with minute precision. Winter Jerusalem samples
  at 06:14 / 06:15 / 18:29 / 18:30 have admission false / true / true / false for daylight
  06:15–18:30. Subhour samples are deliberate synthetic boundary inputs, not a claim about the
  live provider's hourly sampling cadence.
- Samples at or before frozen now are excluded; a qualifying sample immediately after is kept.
- Each forecast day uses its own daylight boundaries. A 06:00 sample qualifies with sunrise
  06:00 but not with sunrise 07:00 on the next day.
- Open-Meteo labels use a fixed response offset across DST. March 26/27 labels 17:00 and sunset
  17:30 at +02:00 are both pre-sunset. October 24/25 labels 19:00 and sunset 18:30 at +03:00
  are both post-sunset. Do not reinterpret those labels as each date's IANA wall time.
- Clip sessions at sunset before applying minimum duration. Hourly 17:00 and 18:00 samples with
  sunset 18:30 yield 90 minutes: retain at a 1.5-hour minimum, exclude at 1.5001 hours. JSON and
  ICS must agree. Zero-minimum duplicates were removed after review.
- Preserve correct instants and timestamp-based marine matches across both DST changes.
- The rendered calendar advances at local midnight after 23/25-hour days and disposes its
  rollover timer on unmount. Existing current-main calendar tests cover local clock labels
  and geometry; they are preserved without reverting that UI decision.

## Execution and cleanup

- `.node-version` pins requested Node 24.22.1 LTS. CI sets `TZ` in separate UTC/Jerusalem/New York
  matrix jobs; the existing `CI` check aggregates those results and the other required checks.
- HTTP suites freeze Date while retaining real network/Effect scheduling. Timer-driven suites
  fake Date/setTimeout/clearTimeout, explicitly advance elapsed time, and use React `act`.
- Dispose owned resources before restoring timers; restore spies, prototype descriptors and
  env/global stubs. Do not drain a self-rescheduling midnight loop with `runAllTimers`.
- Tests show setup, requests and assertions directly. One raw fixture builder lives in the
  existing Open-Meteo fixture module; existing provider mocks handle HTTP responses.

## Verification

Initial dirty-checkout evidence on 2026-10-24: 629 original tests passed in UTC/Jerusalem, while
New York exposed seven date-only fixture mistakes. After fixture repair, all original tests
passed in all three zones. The added regressions then produced nine consistent failures.
The isolated Vitest 4.1.11 worktree also reproduced 636 passes / 9 failures in all three zones.

The branch was rebased onto current `main` (`dd1f686`) to include already-merged dependency,
React Compiler and calendar UI changes without adding them to this PR. Final results below
must be read against that baseline, not the older dirty checkout.

Final verification on macOS, Node 24.22.1, ICU 78.3, tzdata 2026e, Vitest 5.0.5:

- Each timezone: 659 passing / 9 failing / 668 total tests, with the same nine failures.
- Two minute-boundary failures, three per-day/DST daylight failures, four clipping/duration
  failures across JSON and ICS. No unrelated failures remain.
- Typecheck, lint, repository-wide formatting and all four production logging tests pass.
- No production, dependency, lockfile or compiler-config changes relative to current `main`.
- CI/remote-host execution has not been claimed; the workflow is configured for those runs.

Reproduce with Node 24.22.1:

```sh
TZ=UTC pnpm test --silent
TZ=Asia/Jerusalem pnpm test --silent
TZ=America/New_York pnpm test --silent
pnpm typecheck
pnpm lint
pnpm fmt:check
pnpm test:production-logs
```

See [primary-source guidance](../docs/research/vitest-time-testing.md).
Unresolved questions: none for test scope or interval policy. Review tests before production fixes.
