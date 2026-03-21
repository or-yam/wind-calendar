# Phase 6 — Wire Up App.tsx

> **Goal:** Connect the new data fetching to the component tree.
> **Estimated scope:** 1 file modified

**File:** `src/App.tsx` (modified)

## 6.1 Update imports

**Remove:**

```typescript
import { useCalendarFeed } from "./hooks/useCalendarFeed";
```

**Add:**

```typescript
import { useQuery } from "@tanstack/react-query";
import { forecastQueryOptions } from "./lib/forecast-query";
```

**Keep** (still needed for SubscribeButtons):

```typescript
import { buildApiUrl } from "./lib/subscribe-urls";
```

## 6.2 Replace data fetching

**Important: Remove debounce**

The current `debouncedConfig` state is unnecessary. `ConfigForm` sliders use `onValueCommit`
which only fires on release, not during drag. Pass `config` directly to the query.

**Before** (lines 90-93):

```typescript
const [debouncedConfig, setDebouncedConfig] = useState(config);
// ... debounce useEffect ...

const calendarUrl = useMemo(() => buildApiUrl(debouncedConfig), [debouncedConfig]);
const { events, loading, error } = useCalendarFeed(calendarUrl);
const { weekStart, goToToday, goToPrev, goToNext, goToFirstEvent } = useWeekNavigation(events);
```

**After:**

```typescript
const { data, isPending, error } = useQuery(forecastQueryOptions(config));
const sessions = data?.sessions ?? [];
const { weekStart, goToToday, goToPrev, goToNext, goToFirstItem, startOnSunday, toggleWeekStart } =
  useWeekNavigation(sessions);
```

Note: We also extract `startOnSunday` and `toggleWeekStart` from useWeekNavigation
(these were already returned by the hook but not used in App.tsx previously).

## 6.3 Update navigation tracking

**Before** (lines 99-109):

```typescript
useEffect(() => {
  hasNavigatedRef.current = false;
}, [calendarUrl]);

useEffect(() => {
  if (events.length > 0 && !hasNavigatedRef.current) {
    goToFirstEvent();
    hasNavigatedRef.current = true;
  }
}, [events.length, goToFirstEvent]);
```

**After:**

```typescript
useEffect(() => {
  hasNavigatedRef.current = false;
}, [config.location, config.model]);

useEffect(() => {
  if (sessions.length > 0 && !hasNavigatedRef.current) {
    goToFirstItem();
    hasNavigatedRef.current = true;
  }
}, [sessions.length, goToFirstItem]);
```

## 6.4 Update ForecastCards props

**Before:**

```tsx
<ForecastCards
  events={events}
  loading={loading}
  error={error}
  weekStart={weekStart}
  onPrev={goToPrev}
  onNext={goToNext}
  onToday={goToToday}
/>
```

**After:**

```tsx
<ForecastCards
  sessions={sessions}
  isPending={isPending}
  error={error}
  weekStart={weekStart}
  onPrev={goToPrev}
  onNext={goToNext}
  onToday={goToToday}
/>
```

## 6.5 Clean up unused code

After all changes, verify these are no longer used:

- `debouncedConfig` state — removed entirely
- `setDebouncedConfig` — removed
- `useMemo` for calendarUrl — removed
- `useCalendarFeed` — no longer imported
- `buildApiUrl` — can be removed from imports if not used elsewhere in this file

**Verify:**

- [x] `pnpm check` passes (all checks green for the first time since Phase 4)
- [ ] UI smoke test — run `agent-browser` (requires `pnpm dev` + `pnpm dev:api` running):

  ```bash
  # 1. Open app, verify skeleton loading appears
  agent-browser open http://localhost:5173 && agent-browser wait --load networkidle
  agent-browser snapshot -i
  agent-browser screenshot screenshots/phase6-loaded.png

  # 2. Verify forecast cards rendered (look for session data in snapshot)
  agent-browser get text body   # Should contain time ranges, kn values

  # 3. Test week navigation
  agent-browser snapshot -i     # Find Prev/Next/Today buttons
  agent-browser click @eN       # Click "Next" (use ref from snapshot)
  agent-browser wait --load networkidle
  agent-browser snapshot -i    # Verify week changed

  # 4. Test config change triggers refetch
  agent-browser snapshot -i     # Find location dropdown
  agent-browser click @eN       # Open location select
  agent-browser snapshot -i     # Find a different location
  agent-browser click @eN       # Select it
  agent-browser wait --load networkidle
  agent-browser snapshot -i     # Verify new data loaded
  ```
