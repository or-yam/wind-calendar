# Plan 019 — Fix daylight admission and session bounds

**Status:** implemented and reviewed; local checks passed · **Reviewed PR:** [#48](https://github.com/or-yam/wind-calendar/pull/48)
**Base:** `9ecfd9eeeecd6789abd5947f1f321be15daa018e` (PR head; parent `dd1f686`).

This is the implementation plan for the behavior agreed in [Plan 018](018-time-testing.md).
It supersedes the historical raw `HH:MM` map design (Plan 004) and supplies the fix design
missing from Plan 010. Those historical plans are absent from this PR and are not imported.
Production fixes are locally verified below. Parent workspace changes remain untouched.

## Evidence and acceptance

The original PR CI and isolated baseline runs reported 659 passing / 9 failing tests in each of UTC,
Jerusalem, and New York. Two failures expose integer-hour admission; three expose first-day
reuse / mismatched DST clocks; four expose sunset overruns and duration checks before clipping.
A temporary minute-aware admission probe reduced nine failures to seven; it was reverted.

- Sunrise is inclusive; sunset exclusive. Samples at or before now remain excluded.
- Each Open-Meteo day uses its own absolute sunrise/sunset instants, including across DST.
- Clip session end to sunset before checking minimum duration. Samples at 17:00 and 18:00
  with sunset 18:30 give 90 minutes: keep at 1.5 hours, reject at 1.5001. JSON and ICS agree.
- Preserve wind/wave qualification, winner ranking, timestamp decoding, marine matching,
  provider fallback/error classification, and existing cadence rules.

## Model and provider boundary

1. Add `DaylightInterval = { sunrise: Date; sunset: Date }` in
   `server/types/wind-conditions.ts`; add optional `daylight` intervals to `ProviderWindData`.
   Keep legacy `sunrise`/`sunset` strings for existing consumers and Windguru capability.
2. In `server/open-meteo/forecast.ts`, decode every daily sunrise/sunset with the existing
   fixed-offset timestamp conversion. Extract a focused `server/open-meteo/daylight.ts` helper
   if necessary to keep parsing/validation separate from fetch orchestration.
   [Open-Meteo's contract](https://open-meteo.com/en/docs#api_documentation) uses the response's
   request-time `utc_offset_seconds` for both hourly and daily ISO labels across DST.
   Do not reinterpret those labels using each date's IANA offset or change marine matching.
3. Retain provider date labels only while aligning/validating parallel daily arrays. Require
   a finite offset, valid dates/instants, matching array lengths, unique daily dates,
   `sunrise < sunset`, nonoverlapping intervals, and a daily entry for every hourly provider
   date. Reject incomplete/malformed daylight with `ProviderDataError` through Effect;
   preserve existing fallback or `OPENMETEO_BAD_RESPONSE` handling. Never silently reuse day zero.
   Scope validation to the daylight data needed here; no general provider-schema migration.
4. Downstream membership is `sunrise <= sample.date < sunset` against normalized intervals.
   There is no IANA-date lookup against raw provider date keys. This avoids off-by-one dates
   near midnight and mismatched fixed-offset versus IANA daylight clocks.

## Filtering and legacy compatibility

5. Extend `filterEvents` config with optional normalized intervals and its result with
   `daylightByCondition: Map<WindConditionRaw, DaylightInterval>`. Preserve original condition
   objects and existing `conditions` / `matchReasons`; record a window for every admitted sample.
   Pass provider intervals through `buildLocationSessions` in `server/utils/location-sessions.ts`.
6. If intervals are absent (Windguru / legacy callers), resolve the recurring spot-local
   sunrise/sunset pair for the sample's local calendar date in a focused
   `server/utils/daylight.ts` helper. Use native `Intl` date/time parts with minute precision;
   resolve boundaries to absolute instants using the IANA offset at the boundary, not a fixed
   host or sample offset. Cache within the call by timezone/date/pair, not globally by date alone.
   Construct the requested wall fields with `Date.UTC`, enumerate offsets around that local day,
   subtract each offset, and keep candidates whose `Intl` fields round-trip exactly; never parse
   a host-local date string. Ambiguous boundaries use earliest sunrise / latest sunset;
   nonexistent boundaries advance to the first valid local instant. Bound conversion/search to
   the requested date and adjacent days; keep it inside this legacy adapter, not a timezone API.
   Pin exact helper results for Jerusalem sunset 18:30 on 2026-03-27 (15:30Z) and 2026-10-25
   (16:30Z), plus gap/repeated-hour conversion guards if the adapter supports those inputs.
   Windguru still has one recurring pair, not genuine per-day astronomical data.
7. Preserve future-only and wind/wave predicates. Do not change `getLocalHour`'s existing
   integer return contract globally; the daylight helper owns the required precision.

## Grouping and winner selection

8. Add an optional daylight-map argument after `minSessionHours` to `groupSessions` and optional
   window metadata on `Session`. Existing callers without metadata retain their behavior.
   With metadata, split groups when the window changes as well as under existing gap/match rules;
   compare boundary timestamps, not object identity. Never join separate daylight windows just
   because sample gaps are at most three hours. Compute the existing extrapolated end, cap it
   to the group's sunset, reject nonpositive intervals, then apply minimum elapsed duration.
9. Initial location grouping passes the filter's map with minimum zero. In
   `server/utils/select-location-sessions.ts`, explicitly copy each source session's window
   into `Candidate`: the current conversion carries only condition, match type, and location.
   Preserve the window through winner selection and split runs on location, match type, or
   window changes. Reconstruct the map for final `groupSessions` so final clipping precedes
   `config.minSessionHours`. Clipping only the initial session would be overwritten here.
10. Keep winner comparison/ties and timestamp buckets unchanged; do not redesign cadence,
    interval overlap selection, or location ranking. Keep daylight metadata internal;
    existing JSON/ICS serializers consume the common clipped session bounds.

## Incremental execution and tests

1. Start from the exact PR head in an isolated checkout; use its `.node-version` (24.22.1),
   pinned pnpm, and frozen lockfile. Reproduce the three failing files before production edits.
2. Add the missing HTTP regression with different sunsets on consecutive days, asserting exact
   admitted timestamps and JSON/ICS ends. Keep provider HTTP mocked and the real pipeline active.
3. Fix minute-aware legacy admission first; run `tests/unit/utils/filterEvents.test.ts`.
   The two existing boundary failures should turn green without hiding the other seven.
4. Add normalized intervals with focused provider validation tests (including a missing later
   daily entry). Make per-day and spring/autumn HTTP cases green. Keep exact provider/marine
   instant guards passing. Add a near-midnight fixed-offset/IANA-date disagreement case.
5. Thread windows through grouping and selection. Add a competing-location regression where
   winner selection rebuilds a sunset-ending run, retaining it at 1.5 hours and rejecting it at
   1.5001. Add a short-gap/different-window case to prove separate daylight windows stay separate.
   Use `tests/unit/utils/groupSessions.test.ts`, `tests/unit/utils/location-sessions.test.ts`,
   and existing HTTP fixtures; assert public bounds rather than internal map implementation.
6. Make all four clipping HTTP cases green. Add a Windguru minute-boundary/sunset-cap guard
   through the existing Windguru integration seam, including a DST-day spot-local boundary.
   Preserve fallback/error and wind/marine tests. No skips, expected-failure masks, retries,
   forced spot timezones, dependency upgrades, frontend changes, or CI redesign.

## Verification and completion

Run focused tests after each behavior change, then the complete gates from the PR checkout:

```sh
pnpm typecheck
pnpm lint
pnpm fmt:check
TZ=UTC pnpm test
TZ=Asia/Jerusalem pnpm test
TZ=America/New_York pnpm test
pnpm test:production-logs
```

All existing nine regressions and added cases must pass in each timezone. Report actual totals,
Node version, and local results; remote CI success requires the real GitHub run. Keep server
relative imports ending in `.js`, typed Effect failures, and focused files. Update PR description
and Plan 018 status to reflect the implemented behavior only after verification; publish/merge
only within the user's subsequently authorized scope. Historical QA assets are not prerequisites.

## Measured implementation evidence — 2026-11-10

- Isolated checkout: `/Users/oryam/.t3/worktrees/wind-calendar/t3-4ea0cf41-c3c75efffddfc791`.
  Detached HEAD stays `9ecfd9eeeecd6789abd5947f1f321be15daa018e`; all implementation is uncommitted.
- Environment: macOS arm64, Node 24.22.1 (mise), pnpm 11.21.0, ICU 78.3, tzdata 2026e,
  Vitest 5.0.5; frozen lockfile installation completed without dependency/lockfile changes.
- Before edits: three focused files reproduced 9 failures / 26 passes; full UTC suite reproduced
  9 failures / 659 passes. Added varying-sunset and midnight cases both failed before fixes.
- Minute-aware legacy admission made all 28 existing filter tests pass, leaving the other seven
  original failures. Provider normalization/validation first produced 13 failing new cases, then
  passed them. Grouping/winner tests first produced seven failures, then passed after metadata
  propagation and final clipping. Combined focused run: 135 passes across 10 files.
- Added exact spring/autumn legacy conversions, gap/repeated-hour guards, normalized/legacy
  compatibility, separate-window short gaps, winner remainder thresholds 1.5/1.5001, varying
  daily sunset JSON/ICS, midnight date disagreement, malformed provider daylight and Windguru
  HTTP/fallback coverage. Total additional cases: 36; no skipped or weakened regressions.
- The first full implementation run exposed 9 identity-test failures caused by the shared mock's
  missing `daily.time`. Added that date array while keeping all original identity assertions.
- Final `TZ=UTC pnpm test`, `TZ=Asia/Jerusalem pnpm test`, and
  `TZ=America/New_York pnpm test`: **704 passed / 0 failed**, 68 files per separate run.
- `pnpm typecheck`, `pnpm lint`, `pnpm fmt:check`: passed.
  `pnpm test:production-logs`: production build passed, **4 passed / 0 failed**.
  All commands used `mise exec node@24.22.1 --`; full timezone runs set `TZ` explicitly.
- No commit, push, GitHub comment, PR metadata change, or remote CI/review claim. The instruction
  above about updating the PR description is deferred to the parent; this task authorizes local
  implementation and plan updates only.

Parent review found no correctness or spec blockers. The new provider test file was shortened
to meet the repository file-size guideline without changing its cases.

Unresolved questions: none on behavior; remote checks must confirm the pushed revision.
