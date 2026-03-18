# Phase 1 — Infrastructure

> **Goal:** Install dependencies, create types, set up React Query provider.
> **Estimated scope:** 4 files touched

## 1.1 Install `@tanstack/react-query`

```bash
pnpm add @tanstack/react-query
```

This is the only new runtime dependency. React Query v5 (current latest) has zero
sub-dependencies — it's self-contained.

**Verify:**

- [ ] `pnpm check` passes (fmt + lint + typecheck + tests)

## 1.2 Install shadcn `Skeleton` component

```bash
pnpm dlx shadcn@latest add skeleton
```

This creates `src/components/ui/skeleton.tsx` using the project's existing shadcn config
(`components.json`). The Skeleton component is a simple `<div>` with `animate-pulse` and
a muted background color — matches the dark theme automatically via CSS variables.

Reference: https://ui.shadcn.com/docs/components/radix/skeleton

**Verify:**

- [ ] `src/components/ui/skeleton.tsx` exists and exports `Skeleton`
- [ ] `pnpm check` passes

## 1.3 Create shared forecast response types

**File:** `shared/forecast-types.ts` (new)

These types define the **API contract** — the JSON shape returned by `/api/forecast`.
They are placed in `shared/` (not `src/types/`) so both the server (`api/forecast.ts`)
and client (`src/`) import the same types. This eliminates duplication and ensures
the contract stays in sync.

```typescript
export interface HourlyCondition {
  time: string; // ISO 8601 timestamp
  windSpeed: number | null; // knots
  windGusts: number | null; // knots
  windDirection: string | null; // cardinal (N, NE, E, etc.)
  windDirectionDeg: number | null; // degrees 0-360
  waveHeight: number | null; // meters (total wave height)
  wavePeriod: number | null; // seconds
  waveDirection: string | null; // cardinal
  swellHeight: number | null; // meters
  swellPeriod: number | null; // seconds
}

export interface ForecastSession {
  start: string; // ISO 8601 timestamp
  end: string; // ISO 8601 timestamp
  matchType: "wind" | "wave" | "both";
  wind: {
    min: number; // knots (rounded)
    max: number; // knots (rounded)
    gustMax: number; // knots (rounded)
    direction: string; // dominant cardinal direction
  };
  wave: {
    avgHeight: number; // meters (2 decimal places)
    avgPeriod: number; // seconds (rounded)
    direction: string; // dominant cardinal direction
  };
  swell: {
    avgHeight: number; // meters (2 decimal places)
    avgPeriod: number; // seconds (rounded)
  };
  hourly: HourlyCondition[];
}

export interface ForecastResponse {
  meta: {
    location: string; // location slug (e.g. "beit-yanai")
    model: string | number; // Windguru model ID or Open-Meteo model string
    dataSource: string; // e.g. "windguru" or "open-meteo"
    generatedAt: string; // ISO 8601 timestamp
  };
  sessions: ForecastSession[];
}
```

## 1.4 Update `api/forecast.ts` to use shared types

**File:** `api/forecast.ts` (modified)

Remove the inline `HourlyCondition`, `ForecastSession`, and `ForecastResponse` interfaces
(lines 16-59) and import them from shared:

```typescript
// BEFORE (lines 1-4):
import type { CalendarConfig } from "../shared/types.js";

// AFTER:
import type { CalendarConfig } from "../shared/types.js";
import type {
  HourlyCondition,
  ForecastSession,
  ForecastResponse,
} from "../shared/forecast-types.js";
```

The `serializeCondition` (line 61) and `serializeSession` (line 76) functions stay in
`api/forecast.ts` — they transform server-internal types (`WindConditionRaw`, `Session`)
into the shared wire types. Only the type definitions move.

> **Note:** Server imports use `.js` extensions per AGENTS.md convention:
> `"../shared/forecast-types.js"` (not `.ts`).

**Verify:**

- [ ] `pnpm check` passes (especially: existing tests for `api/forecast` still green)

## 1.5 Set up QueryClient and Provider

**File:** `src/main.tsx` (modified)

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 6 * 60 * 60 * 1000,  // 6 hours
      gcTime: 24 * 60 * 60 * 1000,     // 24 hours
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

| Option                 | Value    | Rationale                                                      |
| ---------------------- | -------- | -------------------------------------------------------------- |
| `staleTime`            | 6 hours  | Matches API `Cache-Control: max-age=21600` header              |
| `gcTime`               | 24 hours | Keep old data in memory for back-navigation without refetch    |
| `retry`                | 2        | 2 retries (3 total attempts) — forecasts are not critical-path |
| `refetchOnWindowFocus` | false    | Forecast data doesn't change frequently enough to justify      |

> **Best practice** (`rerender-lazy-state-init`): `queryClient` is created at module scope,
> outside the component tree, so it's never recreated on re-renders.

**Verify:**

- [ ] `pnpm check` passes
- [ ] App loads in browser — run `agent-browser`:
  ```bash
  agent-browser open http://localhost:5173 && agent-browser wait --load networkidle
  agent-browser snapshot -i   # Verify app renders (Hero, ConfigForm, ForecastCards visible)
  agent-browser screenshot screenshots/phase1-provider.png
  ```
