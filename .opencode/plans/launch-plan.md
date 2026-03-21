# Launch Plan

Pre-launch checklist for wind-calendar, organized into sequential phases.
Each phase = its own PR. Phases must be completed in order (later phases depend on earlier ones).

---

## Phase 0 — Merge Existing Work ✅

> **Goal:** Get all in-flight work onto `main` so every subsequent phase branches from a clean baseline.
> **PR:** None (merging existing PRs)
> **Status:** COMPLETE

- [x] Review and merge PR #7 (`feat/calendar-event-icons`) into `main`
- [x] Merge PR #8 (`feat/json-response`) into `feat/calendar-event-icons` — included in PR #7's squash merge
- [x] Both PRs merged. All work (icons + JSON endpoint + health endpoint) is on `main` at `3803fc3`
- [x] Delete stale remote branches: `feat/calendar-event-icons`, `feat/wave-forecast`, `network-refactors`
- [x] Delete stale local branches: `feat/json-response`, `feat/calendar-event-icons`, `feat/wave-forecast`, `open-meteo-migration`, `network-refactors`, `feature/model-selection`

---

## Phase 1 — Housekeeping & Security

> **Goal:** Legal, metadata, and security fundamentals. Quick wins, no UI changes.
> **Branch:** `launch/housekeeping`
> **Depends on:** Phase 0

### License & Repo

- [x] Add `LICENSE` (MIT) to repo root
- [x] Set repo description: `gh repo edit --description "wind and wave forecast calendar feed for surfers"`
- [x] Add topics: `gh repo edit --add-topic windsurfing,calendar,weather,forecast,ics`

### Gate Non-Production Endpoints

- [x] Gate `/api/test-open-meteo` — early-return 404 when `!isDev()`. Currently leaks stack traces (REMOVED)
- [x] Gate `/api/calendar-openmeteo` — early-return 404 when `!isDev()`. Legacy divergent param names, no wave features (REMOVED)

### Security Hardening

- [x] Add CSP as response header in `vercel.json` (meta-tag CSP can't enforce `frame-ancestors` in all browsers)
- [x] ~~Add `.env.example` with documented vars (`VERCEL_ENV`)~~ — Not needed
- [x] Verify `/api/forecast` CORS behavior — Frontend fetches same-origin (relative URLs), no CORS needed in production

### Copy / Spelling / Grammar

- [x] `shared/locations.ts:102` — "Kinnert" → "Kinneret"
- [x] `src/components/SubscribeButtons.tsx:51` — alt `"mac-os calendar logo"` → `"macOS Calendar logo"`
- [x] `src/components/SubscribeButtons.tsx:73` — alt `"Microsoft outlook calendar logo"` → `"Microsoft Outlook calendar logo"`
- [x] `src/components/Footer.tsx:28-36` — "and" is part of the Windguru `<a>`. Move "and" outside

---

## Phase 2 — Responsive & UX

> **Goal:** Make the app usable on mobile. Minimum viable — fix layout breaks, not a redesign.
> **Branch:** `feat/ui-updates`
> **Depends on:** Phase 1
> **Status:** Mostly done — see remaining items below

### Responsive Fixes

- [x] **ForecastCards** — horizontal scroll with `overflow-x-auto`, min card width (~120px), snap points. Cards are unusable at ~40px on mobile
  - Current: `<div className="flex flex-row gap-2">` no overflow/min-width/snap
  - Done: Added `overflow-x-auto snap-x snap-mandatory -mx-5 px-5` to card containers; `min-w-[120px] shrink-0 snap-center` to each card; responsive `sm:overflow-x-visible sm:snap-x-none sm:-mx-0 sm:px-0` to avoid desktop scrollbar regression
- [x] **Hero heading** — `text-[42px]` → responsive (e.g. `text-2xl sm:text-4xl md:text-[42px]`)
  - Current: `text-[42px]` hardcoded, no responsive breakpoints
  - Done: `text-[42px]` → `text-3xl sm:text-4xl md:text-[42px]`
- [x] **SubscribeButtons** — `grid-cols-1 sm:grid-cols-3` for provider buttons, `grid-cols-1 sm:grid-cols-2` for action buttons
  - Current: `grid-cols-3` / `grid-cols-2` hardcoded
- [ ] **ConfigForm** — verify touch usability of sliders/selects at current sizes. Increase if needed
  - SelectTrigger: `h-10` (40px) — below 44px threshold
  - Switch: `h-5` (20px) — below 44px threshold
  - Nav buttons (← Prev/Today/Next): `h-10` (40px) — below 44px threshold

### UX Fixes

- [x] **Empty state** — when all 7 days show dashes, display "No sessions match your filters this week"
  - Current: renders empty card with `―` but no message when all 7 days are empty
  - Done: Added `weekSessions.length === 0` check in ForecastCards.tsx ternary, renders message instead of 7 empty cards
- [x] **Week range** — render `formatWeekRange` near Prev/Today/Next (the function exists but is never called)
  - Current: `formatWeekRange` in `date-utils.ts:70` is imported nowhere
  - Done: Added to ForecastCards.tsx between Prev/Next buttons
- [x] **Loading flash** — init `loading: true` in `useCalendarFeed.ts` to avoid 1-frame empty grid
  - N/A: React Query's `isPending` handles this (hook was removed, now uses `useQuery`)
- [x] **Copy failure** — show user feedback when `navigator.clipboard.writeText` fails
  - Current: only `console.error` in catch block, no user-facing feedback
  - Done: Added error state to copy button — shows "Copy failed" in red when clipboard write fails. Fixed timeout cleanup, race condition, and added aria-live for screen readers (src/components/SubscribeButtons.tsx:86-93)

### Verification

- [x] ForecastCards horizontal scroll verified at 375px (cards scroll with snap)
- [x] Empty state message verified via browser screenshot (app running at localhost:3000)
- [ ] Test on 390px (iPhone 14), 412px (Pixel)
- [ ] No horizontal page overflow on any viewport
- [ ] Touch targets >= 44px on interactive elements

---

## Phase 3 — Accessibility

> **Goal:** Meet baseline a11y. Landmarks, labels, contrast.
> **Branch:** `feat/ui-updates` (continuing from Phase 2)
> **Depends on:** Phase 2 (responsive changes affect DOM structure)

### Must-fix

- [x] Add `<main>` landmark in `App.tsx`
- [x] Add `aria-label` to all sliders in `ConfigForm.tsx` (wind range, wave height, wave period, min session)
- [x] Add `aria-live="polite"` region for forecast loading/error/empty state changes

### Should-fix

- [x] Wrap Prev/Today/Next in `<nav aria-label="Week navigation">`
- [x] Add `aria-label` to each forecast day card (e.g. "Wednesday Mar 15: Wind 18-22 kn")
- [x] Audit & fix color contrast — `text-slate-400`/`text-slate-500` on `bg-[#0B1220]` vs WCAG AA 4.5:1
- [x] Link `Min Period` and `Min Session` labels to sliders via `htmlFor`/`id`

---

## Phase 4 — Tests

> **Goal:** Cover critical gaps. JSON endpoint, security utils, frontend pure functions.
> **Branch:** `launch/tests`
> **Depends on:** Phase 3 (tests should validate the final code)

### High priority

- [ ] Integration tests for `/api/forecast` — mirrors existing `/api/calendar` test structure
- [ ] Unit tests for `server/utils/rate-limit.ts` — sliding window, cleanup, edge cases
- [ ] Unit tests for `server/utils/timezone.ts` — daylight filtering, UTC offsets

### Medium priority

- [ ] Unit tests for `shared/models.ts` — `isValidModelId`, `getProvider`, `getOpenMeteoSlug`, `getWindguruFallback`
- [ ] Unit tests for `server/open-meteo/config.ts` — `parseOpenMeteoQueryParams`, `resolveOpenMeteoLocation`
- [ ] Unit tests for frontend utils: `date-utils.ts`, `ics-parser.ts`, `subscribe-urls.ts`, `wind-colors.ts`

### Infrastructure

- [ ] Add Vitest `coverage` config with `v8` provider, set threshold (e.g. 60%)
- [ ] Extract shared test setup (fetch mocking) into a helper to DRY test files

---

## Phase 5 — Final Review & Ship

> **Goal:** Verify everything works end-to-end before announcing.
> **Branch:** None (done on `main` after all phases merge)
> **Depends on:** Phase 4

- [ ] Run `pnpm check` — format, lint, typecheck, tests all pass
- [ ] Deploy to Vercel preview, smoke test all endpoints (`/api/calendar`, `/api/forecast`, `/api/health`)
- [ ] Verify prod endpoints return 404 for gated routes (`/api/test-open-meteo`, `/api/calendar-openmeteo`)
- [ ] Visual smoke test on desktop + mobile (real device or DevTools)
- [ ] Verify calendar subscription works in Apple Calendar, Google Calendar
- [ ] Check Lighthouse scores (accessibility, best practices, SEO)
- [ ] Update README if any API changes affect documented examples

---

## Post-Launch Backlog

Not blocking launch. Track as issues.

- [ ] `robots.txt` + `sitemap.xml` for SEO
- [ ] Open Graph meta tags (`og:title`, `og:description`, `og:image`) for social link previews
- [ ] Dependabot or Renovate for automated dependency updates
- [ ] PWA service worker for offline
- [ ] Touch swipe gestures for week navigation
- [ ] Multi-spot selection (from `ideas.md`)
- [ ] Downloadable skill from website (from `ideas.md`)
