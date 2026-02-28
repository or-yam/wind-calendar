# Wind Calendar — Migration & Build Plan

## Goal

Migrate server-side code from the MVP (`calendar-test`) into a fresh Vite + React repo.
Single scrollable landing page with calendar preview, config form, and subscribe-to-calendar buttons.
Deployed on Vercel with `api/` serverless functions.

calendar-test is on ../calendar-test 
use it as a reference
Do not modify calendar-test!

---

## Architecture

```
GET /                          GET /api/calendar?location=beit-yanai&windMin=12
 |                              |
 v                              v
Vite SPA (static)              Vercel serverless function
 |                              |
 +-- Hero / explainer          api/calendar.ts -> scraper -> filter -> ICS
 +-- Config form
 +-- Subscribe buttons
 +-- Calendar preview
       |
       fetches /api/calendar
       parses ICS client-side
       renders weekly grid
```

```
├── api/
│   └── calendar.ts              # Vercel serverless function
├── server/
│   ├── scraper/
│   │   ├── api-scraper.ts
│   │   ├── fetch.ts
│   │   └── forecast.ts
│   ├── utils/
│   │   ├── filterEvents.ts
│   │   ├── generateIcsEvents.ts
│   │   ├── groupSessions.ts
│   │   ├── timezone.ts
│   │   └── try-catch.ts
│   ├── types/
│   │   ├── api-response.ts
│   │   ├── forecast.ts
│   │   └── wind-conditions.ts
│   └── config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── Hero.tsx
│   │   ├── ConfigForm.tsx
│   │   ├── SubscribeButtons.tsx
│   │   ├── Caveats.tsx
│   │   ├── CalendarPreview.tsx
│   │   ├── WeekNav.tsx
│   │   └── EventTooltip.tsx
│   ├── hooks/
│   │   ├── useCalendarFeed.ts
│   │   └── useWeekNavigation.ts
│   ├── lib/
│   │   ├── ics-parser.ts
│   │   ├── subscribe-urls.ts
│   │   └── date-utils.ts
│   └── styles/
│       └── calendar.css
├── tests/
│   ├── integration/
│   └── unit/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vercel.json
├── package.json
└── pnpm-lock.yaml
```

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Repo | New repo (`wind-calendar`) | Clean slate, MVP was a prototype |
| Framework | Vite 7 + React 19 | Minimal overhead, `api/` works on Vercel as-is |
| CSS | Plain CSS + custom properties | No framework needed; custom props prep for future dark mode |
| State | React hooks + URL params | No global state needed, form state drives everything |
| ICS parsing | Client-side | API returns standard ICS, parse in browser |
| Routing | None | Single scrollable page, anchor sections |
| Server layout | `server/` directory | Clean client/server separation |
| Test runner | Vitest | Replaces `node:test`, better DX with Vite stack |
| Module resolution | `bundler` (no `.js` extensions) | Cleaner imports, works with both Vite and Vercel |
| Location selector | Dropdown with single option | Future-proof for adding more spots |
| Dark mode | Deferred | Ship light-only first, CSS custom props make retrofit easy |

---

## Migration Reference

| MVP path (`calendar-test`) | New path (`wind-calendar`) | Changes |
|---|---|---|
| `scraper/*` | `server/scraper/*` | Strip `.js` from imports |
| `utils/*` | `server/utils/*` | Strip `.js` from imports |
| `types/*` | `server/types/*` | Strip `.js` from imports |
| `config.ts` | `server/config.ts` | Strip `.js` from imports |
| `api/calendar.ts` | `api/calendar.ts` | Rewrite paths: `../x/` → `../server/x/`, strip `.js` |
| `tests/*` | `tests/*` | Rewrite paths to match new `server/` layout, strip `.js` |
| `public/index.html` | NOT copied | UI reference only — rewritten as React components |

---

## Phase 0: Scaffold + Migrate Server Code

- [ ] 0.1 — `git init` + initial commit of clean Vite scaffold
- [ ] 0.2 — Clean boilerplate: delete `App.css`, `src/assets/`, counter demo, `public/vite.svg`
- [ ] 0.3 — Add `src/vite-env.d.ts`
- [ ] 0.4 — Create `server/` dir, copy `scraper/`, `utils/`, `types/`, `config.ts` from MVP
- [ ] 0.5 — Copy `api/calendar.ts`, fix import paths (`../scraper/` → `../server/scraper/`, etc.)
- [ ] 0.6 — Strip `.js` extensions from all server/api imports (~22 occurrences)
- [ ] 0.7 — Copy `tests/`, fix import paths to match new `server/` layout, strip `.js`
- [ ] 0.8 — Install deps: `ics` (prod), `@vercel/node` + `vitest` + `oxlint` + `oxfmt` (dev)
- [ ] 0.9 — Migrate tests from `node:test` → Vitest (swap `describe`/`it`/`assert`)
- [ ] 0.10 — Configure `tsconfig.node.json`: expand to `api/`, `server/`, `tests/`; bundler resolution
- [ ] 0.11 — Set up `vercel.json` (corepack, API rewrite)
- [ ] 0.12 — Add/update `package.json` scripts: `test`, `fmt`, `lint`, `check`, `start`
- [ ] 0.13 — Verify: `pnpm build` passes, `pnpm test` passes

## Phase 1: Port Calendar Viewer to React

Port the vanilla JS calendar from MVP's `public/index.html` (~1093 lines) into typed React components.

- [ ] 1.1 — `src/lib/ics-parser.ts`: typed ICS parser (`IcsEvent`, `IcsDateTime` types; `unfoldLines`, `parseIcsDateTime`, `unescapeIcsText`, `parseIcs`)
- [ ] 1.2 — `src/lib/date-utils.ts`: `getWeekStart`, `addDays`, `sameDay`, `isToday`, `formatWeekRange`, `formatTime`; `weekStartsOnSunday` as parameter not global
- [ ] 1.3 — `src/styles/calendar.css`: port inline CSS (~430 lines), clean up, CSS custom properties for colors/sizes
- [ ] 1.4 — `CalendarPreview.tsx`: weekly grid — time gutter (06:00–20:00), 7 day columns, absolutely-positioned event blocks (48px/hour)
- [ ] 1.5 — `WeekNav.tsx`: today/prev/next buttons, week range title, Mon/Sun toggle
- [ ] 1.6 — `EventTooltip.tsx`: fixed-position tooltip, mouse tracking, title/time/description
- [ ] 1.7 — `useCalendarFeed(url)`: fetch ICS, parse with ics-parser, return `{ events, loading, error }`
- [ ] 1.8 — `useWeekNavigation(events)`: week state, today/prev/next/goToFirstEvent, keyboard shortcuts (arrows, T), localStorage for week start pref
- [ ] 1.9 — Wire up in `App.tsx` with hardcoded `/api/calendar` URL
- [ ] 1.10 — Visual parity check against MVP viewer

## Phase 2: Config Form + Live Preview

- [ ] 2.1 — `ConfigForm.tsx`: location dropdown (single option: Beit Yanai), windMin/windMax number inputs, minSessionHours
- [ ] 2.2 — `src/lib/subscribe-urls.ts`: URL builder from config params
- [ ] 2.3 — Debounced calendar re-fetch on param change (~300ms)
- [ ] 2.4 — URL search params sync (shareable config URLs, two-way binding)

## Phase 3: Subscribe Buttons

- [ ] 3.1 — `SubscribeButtons.tsx`: Apple Calendar (webcal://), Google Calendar, Copy URL, Download .ics
- [ ] 3.2 — Per-provider sync frequency notes (Google ~12-24h, Apple ~15min, Outlook ~12h)

## Phase 4: Landing Page Content

- [ ] 4.1 — `Hero.tsx`: tagline, one-liner value prop
- [ ] 4.2 — `Caveats.tsx`: sync frequency, forecast accuracy, session definition, daylight hours, timezone
- [ ] 4.3 — Responsive layout: sections stack on mobile, scrollable single page
- [ ] 4.4 — Mobile calendar: day view or simplified week (decide during implementation)

---

## Open Questions

- Mobile calendar layout: day view vs simplified week?
