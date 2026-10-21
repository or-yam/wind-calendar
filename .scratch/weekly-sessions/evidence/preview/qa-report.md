# Weekly sessions — final verification

Date: 2026-10-20. Result: PASS.

Parent QA used `agent-browser` against the protected [Vercel preview](https://wind-calendar-bsu37evfn-oryams-projects-c34482c9.vercel.app). Source commit: `a5c47f4d1fa57eb76d86eb38bf5edf3672ed50ca`. Vercel reported READY, target preview. The deployed client asset (`index-PjuDoA1b.js`) matches the local build. Later changes only record evidence and completion status.

## Standards

Independent Sol review resolved the seven original standards findings and the subsequent disconnected-trigger test coverage finding. Final review at `a5c47f4` passed. Sol independently disabled the focus fallback through an in-memory transform: the new regression test failed with focus on BODY; normal verification passed (2 suites / 5 tests). Production source was unchanged by that test correction. See [round 1 resolution](../../reviews/round1-resolution.md) and [round 2 resolution](../../reviews/round2-resolution.md).

## Spec

Independent Sol spec review at `cbac709` passed: mobile range arrows, 40px mobile grid alignment, overnight focus return, and DST geometry findings were resolved. Its browser checks covered 23-, 25-, 23.5-, and 24.5-hour transition days; 16 suites / 49 tests passed. The subsequent commit only corrected a test and recorded its resolution.

Unresolved findings: Standards 0; Spec 0.

## Local checks

Parent ran `pnpm check` and `pnpm build` on the integrated source: formatting, lint, Effect lint, TypeScript, and 58 suites / 613 tests passed. Build passed with the existing large-client-chunk advisory and Nitro code-splitting notice.

## Live preview checks

- Real health and forecast requests returned HTTP 200. The real forecast produced one wind session; seven desktop columns and three mobile columns rendered without horizontal document overflow.
- Real calendar export returned HTTP 200, `text/calendar`, and a valid VCALENDAR containing one VEVENT.
- Keyboard activation opened session details; closing returned focus to the event.
- Day preference survived reload, filter updates, and browser back/forward. `calendarView` stayed out of forecast requests and subscription URLs.
- After the filter request settled, resizing caused no additional forecast request.

Live evidence: [API/render results](live-result.json), [mobile screenshot](mobile-viewport.png). Browser timezone: Asia/Jerusalem.

## Controlled fixtures on the deployed client

The preview currently disables the wave forecast feature flag. Combined/wave sessions and exceptional timing were therefore exercised by replacing forecast HTTP responses inside the isolated QA browser. Other requests remained live; no server data, deployment configuration, or application source was changed.

- At 320, 390, 768, and 1280px: no horizontal document overflow; event bounds stayed inside the calendar; equal starts used parallel lanes; nested overlap used a third lane; adjacent intervals touched without overlapping. Hour geometry was 40px mobile / 36px desktop. Resize left the forecast call count unchanged.
- Combined details showed independent wind/wave directions, wind range and gust, wave height/period, and swell. Both badges were visible, with compact badges in crowded lanes and complete accessible event names.
- Details survived resize. Removing an overnight trigger through Day mode then closing details focused the remaining segment of the same session.
- Saturday's clamped Thursday–Saturday range moved to Monday–Wednesday through Previous.
- A 45-minute Jerusalem rollback interval measured 30px mobile / 27px desktop, with an elapsed-hours axis and distinct UTC+03:00 / UTC+02:00 labels.
- Loading announced a busy skeleton; empty success announced no matching sessions; HTTP 503 showed an error without a misleading empty calendar. No uncaught browser errors were reported.

Geometry: [320px](geometry-320.json), [390px](geometry-390.json), [768px](geometry-768.json), [1280px](geometry-1280.json). All recorded checks passed.

Reference screenshots use readable sample forecasts after the edge-case checks: [320px](fixture-320.png), [390px](fixture-390.png), [768px](fixture-768.png), [1280px](fixture-1280.png). They preserve the approved theme; crowded lanes intentionally use compact badges, and transition weeks use the documented elapsed-hours axis.

Limit: browser QA used Chromium. Live wave-provider behavior was not exercised because the preview feature flag is disabled; combined and wave rendering were verified through controlled HTTP fixtures.

## CI timezone follow-up — 2026-10-21

GitHub's UTC runner exposed a boundary test that assumed Jerusalem DST offsets. Commit `e444f608ecd02c59d0f9d8febdc288a92c6ff817` explicitly controls UTC and both render dates, retaining exact midnight/week-boundary assertions. Dedicated DST coverage and production code are unchanged from `43922d8`.

Parent `TZ=UTC pnpm check` passed: 58 suites / 617 tests, formatting, lint, and TypeScript. Production logging regression checks also passed (4 tests, including a production build). Independent Sol Standards and Spec review passed with no findings; layout and conditions tests passed 9/9 under UTC, Asia/Jerusalem, Europe/Berlin, and Australia/Sydney. GitHub's rerun result is tracked on PR #43.
