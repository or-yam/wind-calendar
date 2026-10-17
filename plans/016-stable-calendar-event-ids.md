# Stable calendar event IDs

Status: implemented locally after user approval — automated checks pass; real calendar checks pending.
Branch: `fix/stable-calendar-event-ids`
Base: `9b7dcc8`

## Goal

Refreshing a subscription must not give an unchanged session a new event ID.
Changing the weather details must update the existing event, not change its ID.
Real calendar apps still need testing; matching IDs alone do not prove correct refresh behavior.

## What we know

- `server/utils/generateIcsEvents.ts` supplies no UID. The `ics` package supplies a random one.
- The normal generator and calendar API suites have no identity checks.
- Baseline: `pnpm exec vitest run tests/unit/utils/generateIcsEvents.test.ts tests/integration/api/calendar.test.ts` — 26 passed on 2026-10-16.
- Two saved C03 checks covered repeated requests and changed wind with unchanged times. Their scenarios are now covered in the permanent tests with raw provider fixtures. The old `qa-assets/` folder was removed with user approval.
- Sessions can move, split, merge, disappear, or switch winning spots as forecasts change.
- There is no saved event history to match old sessions to new ones.

## Agreed identity rule

Use a deterministic, versioned UID based on location ID and exact UTC start/end instants.
Use a fixed application namespace, not the request host: preview URLs must not change identity.
Do not include weather values, display labels, model, generation time, array position, or random values.
User preferences and subscription URLs are not part of identity. Multiple subscriptions containing the same event are explicitly out of scope, per user decision; do not add feed-specific IDs or block this fix on cross-subscription checks.
Public format: `wind-calendar-v1/<URL-encoded spot ID>/<start epoch milliseconds>/<end epoch milliseconds>@wind-calendar.vercel.app`. No hash, storage, new package, or private-helper tests.

Expected behavior:

| Change                                                                       | ID                                                              |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Same session fetched again, including later or in a fresh process            | Same                                                            |
| Wind, gusts, direction, waves, title or description changes; same spot/times | Same                                                            |
| Display label, input ordering, or server timezone changes                    | Same                                                            |
| Different spot, start instant, or end instant                                | Different                                                       |
| Session splits or merges                                                     | New IDs for changed time ranges; untouched sessions keep theirs |
| Session no longer qualifies                                                  | Not present in the next successful feed                         |
| Same session returns after being absent                                      | Original deterministic ID                                       |

Limit: a time change is treated as a replacement, not an update to the old event.
Do not describe this as solving identity across all forecast changes.
Matching moving sessions reliably would need a separate design, including splits and merges.
Do not use spot + date alone: there can be several sessions at one spot on one day.

## Agreed test boundaries

1. **Generated ICS:** call the existing `generateIcsEvents` function and read public VEVENT fields. Keep the real `ics` library. Use explicit, non-random fixtures. No helper/hash mocks.
2. **Calendar HTTP response:** call the real calendar handler with raw provider HTTP fixtures. Keep parsing, filtering, ranking, grouping and serialization real. Fake only external requests and time; isolate/reset rate-limit state using existing test support. Never accidentally mock the local HTTP request to the handler.
3. **Real subscriptions:** manually check Apple Calendar, Google Calendar and Outlook using a controlled feed. Importing a downloaded file is not a subscription test.

Automated coverage:

- Nonempty UID on every event; different sessions and spots do not share IDs.
- Repeated generation and repeated HTTP requests preserve identity, with the clock advanced.
- A fresh module/process preserves identity; no dependence on in-memory history.
- Weather-only changes retain UID and actually change summary/description.
- Reordered session inputs preserve the mapping from sessions to IDs.
- Distinct UTC instants around daylight-saving changes remain distinct; equivalent instants remain equal under UTC and Asia/Jerusalem runs.
- Start-only/end-only shifts, split, merge, disappearance and reappearance follow the agreed table.
- Multi-spot winner changes follow the location rule; unrelated events retain their IDs.
- A fixed independent expected UID fixture locks the public identity format after selection, so future releases cannot silently change every ID.
- Existing event times, titles, descriptions, headers and valid empty-calendar behavior stay intact.

## TDD execution

After approval, take one behavior at a time: failing test → smallest fix → passing test.
Start with repeated generation, then weather updates and uniqueness; add the HTTP refresh scenario early.
Observe the failure before each fix. Some protection tests may already pass; record that honestly.
Do not write all tests first or mock the UID generator/randomness to manufacture stability.
Do not change provider error handling, session grouping, cache policy, subscription URLs or add storage in this fix.

Checked [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545): sections 3.8.4.7 and 3.8.7.2–4. UID must be persistent and globally unique; a domain namespace is recommended. The existing `ics` output uses METHOD:PUBLISH and a fresh UTC DTSTAMP for each generation. LAST-MODIFIED and SEQUENCE are optional and currently omitted. Keep those defaults unchanged; a new HTTP test checks DTSTAMP still advances while UID stays stable. Do not invent revision numbers from weather hashes or claim stable UID alone proves client updates work.

## Implementation results — 2026-10-16

- Production change: one explicit UID field in `server/utils/generateIcsEvents.ts`.
- TDD: the first unchanged-session test failed on random UIDs before the fix, then passed. Added protection tests passed without further production changes.
- Sensitivity check: temporarily removed only the new UID field; both real HTTP refresh/weather-update tests failed on UID equality. Restored the fix before final checks.
- Added 19 tests in four identity suites under `tests/unit/utils/` and `tests/integration/api/`. Raw provider HTTP fixtures keep the real parser/filter/ranking/grouping/ICS pipeline intact.
- Covers fixed public UID, folded lines, delayed refresh, module reload, changed weather/labels/match type, spots/times, ordering, preferences/models, equivalent instants, repeated DST times, split/merge, removal/return and changed multi-spot winners with an unrelated session retained.
- `pnpm exec vitest run tests`: 39 files / 406 tests passed.
- Focused identity suites: 19 passed under both `TZ=UTC` and `TZ=Asia/Jerusalem`.
- `pnpm build`: passed (includes TypeScript). Existing large-client-chunk/bundler warnings remain.
- `pnpm lint --ignore-pattern 'qa-assets/**'`: passed. Formatting checks passed for all eight changed/new TypeScript files.
- Unscoped `pnpm test` and `pnpm lint` fail on pre-existing, untracked QA assets: two supplemental suites have broken imports; saved deployed JS triggers lint errors. No old QA files or check configuration were modified.
- User approved deleting the untracked `qa-assets/` folder and pushing this branch for Vercel preview QA by DeepSeek V4.1. Branch pushed as `01aa25b`; preview `wind-calendar-4ubwhrewn-...` verified READY at that SHA.
- Independent preview QA passed every automatable check; the full report is kept locally (not committed, per user decision). Production still serves random, changing UIDs; preview serves stable, correctly-formatted, unique, spot-scoped UIDs.
- QA side finding (pre-existing, unrelated to this fix): deployed `Cache-Control` is `public, max-age=21600` on both prod and preview; the `stale-while-revalidate`/`stale-if-error` directives from `server/api/calendar.ts` are not present in the response.
- Real calendar-client validation and the random-to-stable migration test remain pending.

## Release checks

- Run focused tests under `TZ=UTC` and `TZ=Asia/Jerusalem`.
- Run full tests, typecheck, lint, format check and build using pnpm. Avoid broad formatter edits.
- Use a controlled preview feed with synthetic sessions and unchanged cache policy. Allow for cached responses and client refresh delays; verify which feed version each client fetched.
- On each supported calendar client: initial subscribe → unchanged refresh → weather update → time shift → split/merge → removal. Record device/app, actual refresh, event counts, visible details and result. No guessed pass from clicking Subscribe.
- Check existing subscriptions through the transition from random to stable IDs. Old random IDs cannot be reconstructed; duplicates, cleanup or resubscription may be needed. Do not tell users to resubscribe before observing the result.
- No production deployment or claim of client compatibility until those results are recorded. If devices are unavailable, mark those checks pending.

## Open questions

- Who can test Apple, Google and Outlook subscriptions?
