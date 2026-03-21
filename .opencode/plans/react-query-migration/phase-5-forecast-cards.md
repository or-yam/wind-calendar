# Phase 5 — Refactor ForecastCards

> **Goal:** Replace ICS event parsing with structured JSON session data. Add skeleton loading.
> **Estimated scope:** 1 file, major refactor

**File:** `src/components/ForecastCards.tsx` (modified)

## 5.1 Update props interface

**Before:**

```typescript
interface ForecastCardsProps {
  events: IcsEvent[];
  loading: boolean;
  error: string | null;
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}
```

**After:**

```typescript
interface ForecastCardsProps {
  sessions: ForecastSession[];
  isPending: boolean;
  error: Error | null;
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}
```

Key changes:

- `events: IcsEvent[]` → `sessions: ForecastSession[]`
- `loading: boolean` → `isPending: boolean` (matches React Query naming)
- `error: string | null` → `error: Error | null` (React Query returns `Error` objects)

## 5.2 Remove ICS parsing logic

Delete entirely from the file:

| What                       | Lines (current) | Reason                               |
| -------------------------- | --------------- | ------------------------------------ |
| `import type { IcsEvent }` | Line 1          | No longer used                       |
| `RANGE_RGX`                | Line 7          | Regex no longer needed               |
| `SINGLE_RGX`               | Line 8          | Regex no longer needed               |
| `WAVE_RGX`                 | Line 9          | Regex no longer needed               |
| `WAVE_ONLY_RGX`            | Line 10         | Regex no longer needed               |
| `WAVE_COLOR` constant      | Line 11         | Replaced by `waveHeightColor()`      |
| `parseWindKnots()`         | Lines 52-66     | Data is structured now               |
| `parseWaveInfo()`          | Lines 72-82     | Data is structured now               |
| `getEventType()`           | Lines 84-93     | Use `session.matchType` directly     |
| `windTextColor()`          | Lines 68-70     | Moved to `wind-colors.ts` in Phase 3 |

**Add imports:**

```typescript
import type { ForecastSession } from "@shared/forecast-types";
import { windColor, windTextColor } from "@/lib/wind-colors";
import { waveHeightColor, waveHeightTextColor } from "@/lib/wave-colors";
import { Skeleton } from "@/components/ui/skeleton";
```

## 5.3 Update `groupByDay`

**Before:**

```typescript
interface DayGroup {
  key: string;
  date: Date;
  events: IcsEvent[];
}
function groupByDay(events: IcsEvent[]): DayGroup[] {
  // groups by event.dtstart.date.toDateString()
}
```

**After:**

```typescript
interface DayGroup {
  key: string;
  date: Date;
  sessions: ForecastSession[];
}
function groupByDay(sessions: ForecastSession[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const session of sessions) {
    const date = new Date(session.start);
    const key = date.toDateString();
    if (!map.has(key)) map.set(key, { key, date, sessions: [] });
    map.get(key)!.sessions.push(session);
  }
  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}
```

## 5.4 Update session card rendering

**Before** (regex-based):

```typescript
const eventType = getEventType(event.summary); // regex on summary icon
const wind = parseWindKnots(event.summary); // regex "15-20kn"
const waveInfo = parseWaveInfo(event.summary); // regex "1.5m 8s"
const midKnots = wind ? wind.mid : 15;
const borderColor = eventType === "wave" ? WAVE_COLOR : windColor(midKnots);
```

**After** (structured data):

```typescript
const midKnots = (session.wind.min + session.wind.max) / 2;
const borderColor =
  session.matchType === "wave" ? waveHeightColor(session.wave.avgHeight) : windColor(midKnots);

const windLabel =
  session.wind.min === session.wind.max
    ? `${session.wind.min} kn`
    : `${session.wind.min}–${session.wind.max} kn`;

const icon =
  session.matchType === "both"
    ? `${WIND_ICON}${WAVE_ICON}`
    : session.matchType === "wave"
      ? WAVE_ICON
      : WIND_ICON;

const start = new Date(session.start);
const end = new Date(session.end);
const timeRange = `${formatTimeFromDate(start)} – ${formatTimeFromDate(end)}`;
```

**Badge rendering:**

Wind badge:

```tsx
{
  session.matchType !== "wave" ? (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums"
      style={{
        backgroundColor: windColor(midKnots),
        color: windTextColor(midKnots),
      }}
    >
      {windLabel}
    </span>
  ) : null;
}
```

Wave badge:

```tsx
{
  session.matchType !== "wind" && session.wave.avgHeight > 0 ? (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums"
      style={{
        backgroundColor: waveHeightColor(session.wave.avgHeight),
        color: waveHeightTextColor(session.wave.avgHeight),
      }}
    >
      {session.wave.avgHeight.toFixed(1)}m
      {session.wave.avgPeriod > 0 ? ` ${session.wave.avgPeriod}s` : ""}
    </span>
  ) : null;
}
```

> **Best practice** (`rendering-conditional-render`): Use ternary `? : null` not `&&` for
> conditional rendering to avoid accidental `0` or `""` rendering.

## 5.5 Add skeleton loading state

Replace the current spinner:

```tsx
{
  /* CURRENT — delete this */
}
{
  loading && (
    <div className="w-8 h-8 rounded-full border-2 ..." role="status" aria-label="Loading" />
  );
}
```

With 7 skeleton cards matching the exact card layout:

```tsx
function ForecastCardSkeleton() {
  return (
    <div className="bg-[#0D1525] border border-[#1F2937] rounded-lg p-2 flex-1 min-w-0 border-l-4 border-l-slate-700 aspect-[3/2] flex flex-col">
      <Skeleton className="h-3 w-16 mb-1" />
      <Skeleton className="h-4 w-6 mb-1" />
      <Skeleton className="h-3 w-20 mb-1" />
      <Skeleton className="h-4 w-12 mt-auto" />
    </div>
  );
}

// In render:
{
  isPending ? (
    <div className="flex flex-row gap-2">
      {Array.from({ length: 7 }, (_, i) => (
        <ForecastCardSkeleton key={i} />
      ))}
    </div>
  ) : null;
}
```

Visual approximation of skeleton vs loaded card:

```
 Skeleton                        Loaded Card
 ┌────────────────┐              ┌────────────────┐
 │ ▓▓▓▓▓▓         │ day label   │ MON Jan 1      │
 │ ▓▓▓            │ icon        │ ►≈             │
 │ ▓▓▓▓▓▓▓▓       │ time range  │ 08:00 – 14:00  │
 │                │              │                │
 │ ▓▓▓▓▓          │ badge       │ 15–20 kn       │
 └────────────────┘              └────────────────┘
```

## 5.6 Update error display

```tsx
{
  error ? <p className="text-red-400 text-sm text-center py-8">{error.message}</p> : null;
}
```

> `error` is now an `Error` object (React Query), not a plain string.

**Verify:**

- [ ] `pnpm typecheck` — may still fail on `App.tsx` (resolved in Phase 6)
- [ ] `pnpm lint` passes
- [ ] `pnpm fmt:check` passes
- [ ] `pnpm test` passes
