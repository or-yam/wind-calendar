# Phase 7 — Verification

> **Goal:** Full end-to-end verification — static checks, build, and automated UI testing.

## 7.1 All checks passing

```bash
pnpm check   # runs: fmt:check + lint + typecheck + vitest
```

- [ ] Format — zero issues
- [ ] Lint — zero warnings/errors
- [ ] TypeScript — zero errors
- [ ] Tests — all 9 existing test files pass
  - These test server/API code only — should be unaffected by client changes
  - If any fail, it indicates an accidental change to `shared/` code

## 7.2 Build

```bash
pnpm build   # runs: tsc -b && vite build
```

- [ ] Build succeeds
- [ ] Check bundle size: React Query adds ~13kB gzipped — verify no unexpected bloat

## 7.3 UI verification with `agent-browser`

**Prerequisites:** Start both dev servers in separate terminals:

```bash
pnpm dev          # Vite frontend (port 5173)
pnpm dev:api      # Vercel API (port 3000)
```

### 7.3.1 Initial load and skeleton

```bash
agent-browser open http://localhost:5173
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot screenshots/final-loaded.png
```

- [ ] App renders without errors (snapshot shows Hero, ConfigForm, ForecastCards sections)
- [ ] Forecast data loaded (snapshot contains time ranges like "08:00", wind values like "kn")
- [ ] No console errors — check via:
  ```bash
  agent-browser list console messages --types error
  ```

### 7.3.2 Data rendering

```bash
agent-browser snapshot -i
agent-browser get text body
```

- [ ] Wind sessions show `►` icon + wind speed badge
- [ ] Wave sessions show `≈` icon + wave height badge
- [ ] Combined sessions show `►≈` icons + both badges
- [ ] Empty days show "―" placeholder
- [ ] Time ranges formatted correctly (e.g., "08:00 – 14:00")

### 7.3.3 Color verification

```bash
# Screenshot our app for color review
agent-browser screenshot screenshots/final-colors.png

# Screenshot Windguru for side-by-side comparison
agent-browser open https://www.windguru.cz/771
agent-browser wait --load networkidle
agent-browser screenshot screenshots/windguru-comparison.png
```

- [ ] Wind badge colors visually match Windguru gradient
  - 10kn ~cyan/green, 15kn ~green, 20kn ~yellow, 25kn ~red
- [ ] Wave badge colors follow Windguru wave height gradient
  - Waves <1m ~white/light, 3m+ ~blue
- [ ] Badge text readable (dark on light bg, light on dark bg)

### 7.3.4 Navigation

```bash
agent-browser open http://localhost:5173
agent-browser wait --load networkidle
agent-browser snapshot -i   # Find Prev/Next/Today buttons
```

- [ ] Auto-navigates to first session week on initial load
- [ ] Click "Next →" button — week advances:
  ```bash
  agent-browser click @eN          # "Next →" ref from snapshot
  agent-browser wait --load networkidle
  agent-browser snapshot -i        # Verify different week shown
  ```
- [ ] Click "← Prev" — week goes back
- [ ] Click "Today" — returns to current week

### 7.3.5 Config changes trigger refetch

```bash
agent-browser snapshot -i          # Find location select
```

- [ ] Change location — skeleton appears, new data loads:
  ```bash
  agent-browser click @eN          # Location select trigger
  agent-browser snapshot -i        # List items
  agent-browser click @eN          # Pick different location
  agent-browser wait --load networkidle
  agent-browser snapshot -i        # Verify new data
  ```
- [ ] Change model — triggers refetch
- [ ] Change wind slider — triggers refetch (no debounce needed)
- [ ] URL search params update:
  ```bash
  agent-browser get url            # Should contain new location param
  ```

### 7.3.6 Subscribe buttons

```bash
agent-browser snapshot -i          # Find subscribe section
```

- [ ] Verify subscribe URLs use `/api/calendar` (NOT `/api/forecast`):
  ```bash
  agent-browser eval 'JSON.stringify(Array.from(document.querySelectorAll("a[href*=\"calendar\"]")).map(a => a.href))'
  ```
- [ ] Apple Calendar link contains `webcal://`
- [ ] Google Calendar link contains `calendar.google.com`
- [ ] Outlook link contains `outlook.live.com`
- [ ] Copy URL button works:
  ```bash
  agent-browser click @eN          # "Copy URL" button
  agent-browser snapshot -i        # Should show "Copied!" text
  ```

### 7.3.7 Error handling

```bash
# Stop the API server, then test error state
agent-browser open http://localhost:5173?location=beit-yanai
agent-browser wait 10000           # Wait for retries to exhaust
agent-browser snapshot -i
agent-browser screenshot screenshots/final-error-state.png
```

- [ ] Error message visible in ForecastCards area
- [ ] Error boundary contains the error (page doesn't crash entirely)

### 7.3.8 Caching

```bash
# Load with one config
agent-browser open http://localhost:5173?location=beit-yanai
agent-browser wait --load networkidle

# Switch to different config
agent-browser snapshot -i
agent-browser click @eN            # Change location
agent-browser wait --load networkidle

# Switch back — should load from cache (no network request)
agent-browser click @eN            # Change location back
agent-browser snapshot -i          # Data should appear instantly (no skeleton)
```

- [ ] Returning to previous config loads from cache (no skeleton flash, no network request)
