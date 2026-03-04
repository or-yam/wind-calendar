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

**Preferred pattern** - Use `tryCatch` wrapper

**API errors** - Use `ApiError` class

**Validation** - Direct throws:

```typescript
if (invalid) throw new Error("Descriptive message with context");
```

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
