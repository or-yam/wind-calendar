# Vitest time-testing guidance

Research date: 2026-10-24. PR verification: 2026-10-25, Node 24.22.1 LTS.
The original dirty checkout used Vitest 5.0.5; an isolated check also reproduced the same nine
regressions on the older Vitest 4.1.11 baseline. The PR was then rebased onto current `main`,
which already contains the Vitest 5.0.5 upgrade and React Compiler annotation pilot.
Neither upgrade is part of this PR. See [verification and agreed behavior](../../plans/018-time-testing.md).

## Clock and scheduling

- `vi.setSystemTime` freezes date APIs without mocking scheduling. When fake timers are active,
  it changes now without firing callbacks. Always restore with `vi.useRealTimers`, including
  date-only mocks; `vi.isFakeTimers()` does not identify every mocked-date state.
  [Clock API](https://vitest.dev/api/vi.html#vi-setsystemtime),
  [versioned implementation](https://github.com/vitest-dev/vitest/blob/v5.0.5/packages/vitest/src/integrations/mock/timers.ts).
- Enable fake timers only when testing scheduled behavior. Select the required APIs with
  `toFake`; explicitly advance time. Await async advancement for Promise/timer chains and wrap
  React updates in `act`. Advancing timers is not a general network/Effect completion primitive.
  [Fake timers](https://vitest.dev/config/faketimers),
  [advancement](https://vitest.dev/api/vi.html#vi-advancetimersbytimeasync).
- Unmount/dispose owned resources before restoring timers. Recursive midnight scheduling makes
  unconditional `runAllTimers` teardown inappropriate; bounded advancement and cleanup assertions
  test the behavior directly. [Timer API](https://vitest.dev/api/vi.html#vi-runalltimers).

## Timezones and fixtures

- Vitest's default `forks` pool uses child processes. Changing `process.env.TZ` in worker threads
  does not change their timezone. Keep time/global-mutating tests sequential within a worker.
  [Pool documentation](https://vitest.dev/config/pool).
- CI can set `TZ` before Vitest starts; no custom runner is needed. Run `pnpm test` directly
  locally and use CI matrix environment variables for UTC, Jerusalem, and New York.
  [Node timezone configuration](https://nodejs.org/api/cli.html#tz).
- Date-only ISO strings represent UTC midnight; numeric components represent local calendar
  fields. Use numeric constructors for calendar dates and explicit `Z`/offsets for instants.
  Freeze now relative to fixture dates rather than depending on 2099 remaining in the future.
  [ECMAScript parsing](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.parse),
  [constructor](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date).
- Pin the requested [Node 24.22.1 LTS](https://nodejs.org/en/blog/release/v24.22.1) in development
  and CI. Frozen time does not freeze timezone rules: Node/ICU/tzdata versions also matter.
  [Node internationalization](https://nodejs.org/api/intl.html).

## Mocks and independent expectations

- Mock external provider HTTP and time. Keep parsing, filtering, grouping and serialization real
  for daylight regressions; reuse the existing fetch mocks without adding another abstraction.
  Vitest recommends MSW for general request interception; these deterministic response fixtures
  do not require another dependency. [Request mocking](https://vitest.dev/guide/mocking/requests).
- History clearing, implementation reset, spy restoration, env/global unstubbing, and timer
  restoration are distinct operations. Vitest 5 defaults `clearMocks` to true; Vitest 4.1.11
  defaults it to false. Neither clears clocks or restores global values. Keep explicit owned
  teardown and avoid redundant config or blanket `mockReset` changes.
  [Clear mocks](https://vitest.dev/config/clearmocks), [restore mocks](https://vitest.dev/config/restoremocks),
  [globals](https://vitest.dev/guide/mocking/globals), [envs](https://vitest.dev/config/unstubenvs).
- Open-Meteo ISO labels use one request-time `utc_offset_seconds` across DST, including daily
  boundaries. Decode labels with that response offset; compare sample/daylight instants on a
  consistent clock. Tests use literal expected instants and reversed marine responses so they
  can detect decoding or alignment errors independently. The older parser-defect claim was
  withdrawn; missing historical QA assets are not evidence for changing the parser.
  [Provider contract](https://open-meteo.com/en/docs#api_documentation).
