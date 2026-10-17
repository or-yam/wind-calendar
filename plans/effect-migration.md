# Plan: Server-side Effect.ts migration

Base: `main` @ `9b7dcc8`. Scope: `server/` only. No client (`src/`) or `shared/` changes.

This executes the Effect.ts migration proposed in the exploration doc
(`effect_migration_exploration.md`), phases 1–3, plus the tryCatch call sites. It keeps the HTTP
contract byte-identical: every status code, response body, and header produced today must be
produced after.

## Goal

Replace the hand-rolled error plumbing (a `Result<T, E>` wrapper, an `ApiError` class, and a
`classifyFetchError` that string-matches on `error.message`) with typed, tagged Effect errors. The
string-matching hack is the clearest signal this code wants Effect.

## Non-goals

- **Phase 5 (Zod → Zod Mini).** Not Effect, and the only client-visible change. Ships on its own.
- **Effect Schema for query params (Phase 4).** `parseQueryParams` reads `URLSearchParams`
  including _repeated_ `locations` keys via `getAll`, which a record-based schema cannot represent
  without a custom transform. Handlers only surface the error as a message string, so typed config
  errors buy nothing observable. `config.ts` is left untouched; the handler wraps the existing
  throwing parser in `Effect.try` to produce a `ConfigError` — typed at the boundary without a
  risky rewrite.
- **Client/browser.** Effect stays out of `src/`.
- **`shared/calendar-config-schema.ts`.** Stays Zod (Standard Schema V1 for the AI SDK).

## Design

### Errors (`server/errors.ts`, new)

`Data.TaggedError` classes carrying a `message` field (so they stay `instanceof Error` and keep
their human-readable text for logs and test assertions):

- Transport/parse: `ProviderTimeout`, `ProviderNetworkError`, `ProviderBadStatus`,
  `ProviderBadJson`, `ProviderDataError` → union `ProviderError`.
- Pipeline: `ForecastError` (carries `status` + `body`), `ConfigError`, `ExternalError`.

`classifyProviderError(error, provider, locationInfo, dev): ForecastError` ports
`classifyFetchError` exactly, dispatching with `Match` on the tag instead of `instanceof` +
`message.includes(...)`. Same status codes, error codes, messages, suggestions, and `debug` fields.

### HTTP primitive (`server/utils/http.ts`, new)

`providerFetch` / `providerBodyText` / `providerJson` / `providerBadStatus` build
`Effect.tryPromise` wrappers around `fetch`. Both providers compose them, so the duplicated
`makeRequest` bodies collapse.

### Providers → Effect

- `server/windguru/fetch.ts`, `server/open-meteo/fetch.ts`: `makeRequest<T>` → `Effect<T, ProviderError>`.
- `server/windguru/forecast.ts`: `getForecast` → `Effect<APIRoot, ProviderError>`.
- `server/windguru/api.ts`: `fetchWindData` → `Effect<ProviderWindData, ProviderError>`. GFS
  fallback becomes `Effect.catch`; the non-fatal wave fetch becomes
  `Effect.tapError(log) → Effect.option`.
- `server/open-meteo/forecast.ts`: `fetchOpenMeteoData` → `Effect<ProviderWindData, ProviderError>`.
  Parse throws (`extractTime`, `extractWindData`, missing sunrise/sunset) become `ProviderDataError`
  so they classify as `OPENMETEO_BAD_RESPONSE` instead of escaping as defects.
- Wind + wave fetches run under `Effect.all(..., { concurrency: "unbounded" })` to preserve the
  existing parallel fetch.

### Forecast resolution → Effect

- `server/utils/api-handler.ts`: `resolveForecastData` → `Effect<ResolvedForecast, ForecastError>`;
  `fetchWindguruWithErrorHandling` → `Effect<ProviderWindData, ForecastError>`. The
  `{ success, status, body }` triples collapse into `ForecastError`. `toHttpError` maps
  `ConfigError | ForecastError` → `HTTPError` with `Match`.
- `server/utils/location-sessions.ts`: `buildLocationSessions` → `Effect<LocationForecast, ForecastError>`,
  using `Effect.forEach(..., { concurrency: "unbounded" })` and dropping the `success === false` guards.

### Handlers

`server/api/forecast.ts`, `server/api/calendar.ts`: rate limiting is unchanged. The config parse
and pipeline run in one `Effect.gen`, then
`Effect.mapError(toHttpError)` + `Effect.runPromise`; the resulting rejection is thrown to Nitro
unchanged.

### tryCatch call sites

`server/feature-flags.ts`, `server/api/interpret-config.ts`: replace `tryCatch` with
`Effect.tryPromise`. Delete `server/utils/try-catch.ts` (no remaining importers).

## Invariants to hold

- Response status codes and bodies for 400 / 429 / 502 / 504 unchanged.
- `X-Data-Source`, `X-Fallback-Used`, `Cache-Control`, `Content-Disposition` unchanged.
- GFS fallback: on primary-model failure try model 3; if that fails, surface the _fallback_
  error; if `modelId === 3`, surface the original error.
- Open-Meteo → Windguru fallback: on Open-Meteo failure use the matched Windguru model; if there is
  none, classify the Open-Meteo error.
- Non-fatal wave failures keep the wind forecast and log.

## Tests

- `tests/integration/windguru-forecast.test.ts`, `tests/unit/open-meteo/forecast.test.ts`: run the
  effects with `Effect.runPromise`; failure assertions still match on `.message`.
- Handler integration tests (`forecast`, `calendar`, `open-meteo`): the `resolveForecastData` mock
  returns `Effect.succeed(payload)` instead of a `{ success: true, ... }` promise.
- Add characterization tests for classification/fallback (currently uncovered) so the ported
  mapping is pinned.

## Verification gates

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fmt:check`
4. `pnpm test`
5. `pnpm build` (confirms Effect does not leak into the client bundle)

## Open questions

- `effect` pinned to exact `4.0.5`, or caret?
- `getForecast` wraps model-fetch transport errors into a data error, dropping the upstream status
  (so a 429 becomes `FETCH_FAILED` rather than `_RATE_LIMIT`). Preserved verbatim here as a
  migration invariant; worth fixing separately.
- Expose Effect error tags as API `code` values, or keep HTTP status as the only contract?
