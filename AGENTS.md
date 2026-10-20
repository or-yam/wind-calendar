# Agent Guidelines for wind-calendar

Full-stack TypeScript web app (Vite + React frontend, Vercel serverless backend).

## Commands

Use `pnpm` for all scripts.
See `package.json` for available scripts.

## Project Structure Overview

```
src/              # React frontend (Vite bundler)
server/           # Backend logic (shared by API functions)
  windguru/       # Windguru provider
  open-meteo/     # Open-Meteo provider
api/              # Vercel serverless functions
shared/           # Shared between client & server
tests/            # Vitest test files
```

## Import Conventions

**Server files (.ts in server/, api/)** - Use `.js` extensions:

**Client files (.ts/.tsx in src/)** - No extensions:

## Error Handling

The server uses [Effect](https://effect.website/docs/v4). Client code does not.

- **Errors** — typed `Data.TaggedError` classes live in `server/errors.ts`
  (`ProviderError`, `ForecastError`, `ConfigError`, `ExternalError`).
- **Providers** — `server/windguru/*` and `server/open-meteo/*` return `Effect<A, ProviderError>`,
  built from the `server/utils/http.ts` helpers.
- **Pipelines** — compose with `Effect.gen`; recover with `Effect.catch` / `Effect.catchTag` /
  `Effect.option`.
- **Handlers** — run the pipeline with `Effect.runPromise`, mapping failures to `HTTPError` via
  `toHttpError`.
- **Validation** — wrap throwing parsers with `Effect.try`.

## React Patterns

- `AbortController` for cleanup
- Tailwind CSS v4 inline classes
- `cn()` utility for conditional classes
- shadcn/ui components (customized)

## Architecture Principles

- Client/server separation (`src/` vs `server/`)
- URL params drive state (no global state)
- Single scrollable page (no routing)
- Prefer native solutions over packages
- Small, focused files (< 100 lines)
- Early returns for validation
- Self-documenting code (minimal comments)

## Browser Automation

Use `agent-browser` for web testing/automation. Run `agent-browser --help` for commands.

## Security

- CSP headers (dev vs prod)
- Vercel security headers in `vercel.json`
- Rate limiting per IP
- No secrets in client code
- Validate all user inputs
