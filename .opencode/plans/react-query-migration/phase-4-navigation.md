# Phase 4 — Adapt Navigation

> **Goal:** Make `useWeekNavigation` work with any array of items that have a `start` string.
> **Estimated scope:** 1 file modified

## 4.1 Refactor `useWeekNavigation`

**File:** `src/hooks/useWeekNavigation.ts` (modified)

**Current signature:**

```typescript
import type { IcsEvent } from "../lib/ics-parser";
export function useWeekNavigation(events: IcsEvent[]): UseWeekNavigationResult;
```

**New signature:**

```typescript
export function useWeekNavigation(items: { start: string }[]): UseWeekNavigationResult;
```

**Changes required:**

1. Remove `import type { IcsEvent } from "../lib/ics-parser";`
2. Replace parameter: `events: IcsEvent[]` → `items: { start: string }[]`
3. In `goToFirstItem` (renamed from `goToFirstEvent`):
   - Replace `events[i].dtstart.date` → `new Date(items[i].start)`
   - Replace `events.length` → `items.length`
4. In `UseWeekNavigationResult` interface: rename `goToFirstEvent` → `goToFirstItem`

**The `goToFirstItem` function becomes:**

```typescript
const goToFirstItem = useCallback(() => {
  if (items.length === 0) {
    goToToday();
    return;
  }
  let earliestStart = items[0].start;
  for (let i = 1; i < items.length; i++) {
    if (items[i].start < earliestStart) {
      earliestStart = items[i].start;
    }
  }
  goToWeek(new Date(earliestStart));
}, [items, goToToday, goToWeek]);
```

> **Note:** ISO 8601 strings are lexicographically sortable, so `<` comparison works
> without parsing to `Date` first. This avoids creating `Date` objects in the loop.

**CRITICAL: Preserve existing exports**

The hook currently exports `startOnSunday` state and `toggleWeekStart` function. These
**must be preserved** — they are used elsewhere in the app and are not mentioned in this plan.

Ensure the return type still includes:

- `startOnSunday: boolean`
- `toggleWeekStart: () => void`

**Verify:**

- [ ] `pnpm typecheck` — **expected to fail** on `App.tsx` only (still uses old `events` / `goToFirstEvent`)
  - Run: `pnpm typecheck 2>&1 | grep "error TS"` — errors should only be in `src/App.tsx`
- [ ] `pnpm lint` passes
- [ ] `pnpm fmt:check` passes
- [ ] `pnpm test` passes (server tests unaffected)

> **Note:** `pnpm check` will fail here because typecheck fails. That's expected — resolved in Phase 6.
