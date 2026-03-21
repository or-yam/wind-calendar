# React Query Migration Plan

Migrate the UI preview from ICS calendar feed parsing to the `/api/forecast` JSON endpoint
using TanStack React Query. Subscribe buttons continue using the ICS `/api/calendar` endpoint.

**Created:** 2026-03-16
**Status:** Draft
**Branch:** `feat/ui-updates` (current working branch — all work committed here)

> **Note:** Phases are logical groupings, not strict execution order. Some phases depend on others, but you may interleave work as needed.

---

## Table of Contents

- [Reference - Windguru Colors](#reference---windguru-colors)
- [Phase 1 - Infrastructure](#phase-1---infrastructure)
- [Phase 2 - Data Fetching Layer](#phase-2---data-fetching-layer)
- [Phase 3 - Color System](#phase-3---color-system)
- [Phase 4 - Adapt Navigation](#phase-4---adapt-navigation)
- [Phase 5 - Refactor ForecastCards](#phase-5---refactor-forecastcards)
- [Phase 6 - Wire Up App.tsx](#phase-6---wire-up-apptsx)
- [Phase 7 - Verification](#phase-7---verification)

---

## Progress Tracking

- [x] **Phase 1** — Infrastructure
  - [x] 1.1 Install @tanstack/react-query
  - [x] 1.2 Install shadcn Skeleton
  - [x] 1.3 Create shared forecast types
  - [x] 1.4 Update api/forecast.ts to use shared types
  - [x] 1.5 Set up QueryClientProvider

- [x] **Phase 2** — Data Fetching Layer
  - [x] 2.1 Create fetch-forecast.ts
  - [x] 2.2 Create forecast-query.ts

- [x] **Phase 3** — Color System
  - [x] 3.1 Update wind color stops (0-70)
  - [x] 3.2 Add wave color functions

- [x] **Phase 4** — Adapt Navigation
  - [x] 4.1 Refactor useWeekNavigation

- [x] **Phase 5** — Refactor ForecastCards
  - [x] 5.1 Update props interface
  - [x] 5.2 Remove ICS parsing logic
  - [x] 5.3 Update groupByDay
  - [x] 5.4 Update session card rendering
  - [x] 5.5 Add skeleton loading
  - [x] 5.6 Update error display

- [x] **Phase 6** — Wire Up App.tsx
  - [x] 6.1 Update imports
  - [x] 6.2 Replace data fetching (remove debounce)
  - [x] 6.3 Update navigation tracking
  - [x] 6.4 Update ForecastCards props
  - [x] 6.5 Clean up unused code

- [x] **Phase 7** — Verification
  - [x] 7.1 All checks passing (pnpm check)
  - [x] 7.2 Build succeeds
  - [x] 7.3 UI verification (agent-browser: sessions load, auto-nav works, no JS errors)

> **Also fixed during verification:**
>
> - `isPending` ternary chain in ForecastCards (was showing stale errors over cached data)
> - Vite proxy missing for `/api/*` (caused "API returned non-JSON" error in dev)

---

## Context

### Why this migration?

The UI currently fetches an **ICS calendar feed** (`/api/calendar`), parses it with a custom
ICS parser (`src/lib/ics-parser.ts`), then uses regex to extract wind/wave data from event
summary strings like `"► 15–20kn | 1.5m 8s waves"`. This is fragile and lossy.

The `/api/forecast` endpoint (already shipped, see `api/forecast.ts`) returns **structured JSON**
with typed session data — wind min/max/gusts, wave height/period/direction, swell data, and
per-hour conditions. Moving to this endpoint eliminates regex parsing entirely and unlocks
richer UI features (hourly breakdowns, swell display, direction indicators).

### What stays the same?

- **Subscribe buttons** (`SubscribeButtons.tsx`) continue using `/api/calendar` (ICS format)
  because calendar apps (Apple, Google, Outlook) require ICS feeds
- **URL parameter sync** — config is still driven by URL search params

### What changes?

- `useCalendarFeed` hook replaced by React Query (`useQuery`)
- `ForecastCards` no longer parses ICS text — uses structured `ForecastSession` data
- `useWeekNavigation` accepts any `{start: string}[]` array
- Loading state upgraded from spinner to skeleton cards
- Color system updated to match actual Windguru gradients (wind + wave)
- **Debounce removed** — `ConfigForm` uses `onValueCommit` which only fires on release

### Branching strategy

All work is done on the **`feat/ui-updates`** branch (the current working branch).
No new branches — commits land directly here.

### Type sharing strategy

Forecast API response types (`ForecastResponse`, `ForecastSession`, `HourlyCondition`)
are defined **once** in `shared/forecast-types.ts` and imported by both sides:

```
shared/forecast-types.ts          ◄── single source of truth
    ▲                ▲
    │                │
    │                └── Client: import type { ... } from "@shared/forecast-types"
    │                    (used by ForecastCards, fetch-forecast, etc.)
    │
    └── Server: import type { ... } from "../shared/forecast-types.js"
        (used by api/forecast.ts — replaces current inline definitions)
```

This eliminates the type duplication that would occur if we defined the types
separately in `src/types/` and `api/`. The `shared/` directory already supports
cross-boundary imports (see Project Configuration in reference).

> **Note:** Server-internal types (`Session`, `WindConditionRaw`) stay in `server/types/`
> — they contain `Date` objects and are not JSON-serializable. Only the wire-format
> types (strings, numbers, nulls) belong in `shared/`.

---

## Developer Commands

```bash
pnpm dev          # Vite dev server (frontend only)
pnpm dev:api      # Vercel dev server (API functions)
pnpm typecheck    # TypeScript check (tsc -b --noEmit)
pnpm lint         # oxlint
pnpm fmt          # oxfmt --write
pnpm fmt:check    # oxfmt --check
pnpm test         # vitest run
pnpm check        # fmt:check + lint + tsc + vitest (full CI check)
pnpm build        # tsc -b && vite build

# TanStack CLI
npx @tanstack/cli doc query framework/react/reference/useQuery

# shadcn CLI
pnpm dlx shadcn@latest add skeleton
```
