<div align="center">
  <img src="public/android-chrome-512x512.png" width="120" />

# Wind Calendar

**Generate windsurfing calendar feeds from weather forecasts**

Subscribe to filtered wind forecasts for your preferred spots and get notifications when conditions are good.

[**Launch App →**](https://wind-calendar.vercel.app)

---

</div>

## Features

- Smart filtering - Only get events when wind speed, daylight, and wave conditions match your preferences
- Multi-spot subscriptions - Track up to three spots in one calendar and keep the best overlap
- Multiple forecast models - Choose from GFS, ICON, GDPS, or IFS-HRES weather models
- Session grouping - Automatically merges consecutive forecast hours into surf sessions
- Calendar integration - Subscribe via standard ICS/webcal protocol (works with all major calendar apps)
- Israeli surf spots - Pre-configured for Beit Yanai, Bat Galim, Herzliya, and More
- Free-text setup - Describe conditions in English or Hebrew, then review and confirm the extracted settings

---

## Quick Start

**Web Interface (Recommended)**  
Visit [wind-calendar.vercel.app](https://wind-calendar.vercel.app) to configure your preferences and get a subscription link.

**Direct API**  
Construct a URL and subscribe by replacing `https://` with `webcal://`:

```
webcal://wind-calendar.vercel.app/api/calendar?locations=herzliya,beit-yanai&windMin=14&model=om_gfs
```

Paste the `webcal://` URL into your calendar app (Apple Calendar, Google Calendar, Outlook, etc.) to subscribe.

---

## For AI Agents

This project provides a public API for wind forecast calendar feeds. AI agents can discover this functionality via the SKILL file, located at `skills/wind-calendar/SKILL.md`.

To install the skill, use the following command:

```bash
npx skills add https://github.com/or-yam/wind-calendar --skill wind-calendar
```

**Quick Example:**

```bash
https://wind-calendar.vercel.app/api/calendar?locations=herzliya,beit-yanai&windMin=14
```

Returns an ICS calendar feed with windsurfing/kitesurfing sessions filtered by wind conditions.

---

## How It Works

1. Fetch - Pulls wind and wave forecast data from Open-Meteo (primary) or [Windguru](https://www.windguru.cz/) (fallback)
2. Filter - Removes forecasts outside your wind speed range, during darkness, or below minimum wave height
3. Rank - Picks the best spot for each forecast interval by wind, then wave
4. Group - Merges adjacent winning forecasts into sessions (max 3-hour gap between points)
5. Generate - Creates ICS calendar events with the winning spot and session details

### Filtering Logic

- Wind speed must be within `windMin` to `windMax` range (note: gusts are NOT capped by windMax)
- Forecast must be during daylight hours (timezone-aware using spot's IANA timezone)
- Wave height must be >= `waveHeightMin` (if wave data available)
- Grouped sessions must be >= `minSessionHours` duration

---

## Config Options

### API Query Parameters

| Parameter         | Type           | Default      | Description                                                      |
| ----------------- | -------------- | ------------ | ---------------------------------------------------------------- |
| `locations`       | string         | `beit-yanai` | Comma-separated location IDs (1-3); `location` remains supported |
| `windMin`         | number         | `14`         | Minimum wind speed in knots (>= 0)                               |
| `windMax`         | number         | `35`         | Maximum wind speed in knots (<= 200)                             |
| `minSessionHours` | number         | `2`          | Minimum session duration in hours (0-24)                         |
| `model`           | string, number | `om_gfs`     | Forecast model (see below)                                       |

### Example API Request

```bash
curl "https://wind-calendar.vercel.app/api/calendar?locations=beit-yanai,herzliya&windMin=14&windMax=35&minSessionHours=2&model=om_gfs"
```

---

## Forecast Models

### Open-Meteo (Recommended)

Primary provider using open-source weather data from government agencies:

| Model ID  | Model Name    | Description                                     |
| --------- | ------------- | ----------------------------------------------- |
| `om_gfs`  | GFS 13 km     | NOAA Global Forecast System (default, reliable) |
| `om_icon` | ICON 13 km    | DWD German model (excellent for Europe/Med)     |
| `om_gdps` | GDPS 15 km    | Canadian Meteorological Centre global model     |
| `om_ifs`  | IFS-HRES 9 km | ECMWF high-resolution (often most accurate)     |

**Data provided by [Open-Meteo.com](https://open-meteo.com/)** (CC-BY 4.0 license) using public weather model data from NOAA, DWD, CMC, and ECMWF.  
**Fallback:** Automatically falls back to [Windguru](https://www.windguru.cz/) if Open-Meteo is unavailable.

### Windguru (Legacy)

Legacy provider supported for backward compatibility:

| Model ID | Model Name    | Open-Meteo Equivalent |
| -------- | ------------- | --------------------- |
| `3`      | GFS 13 km     | `om_gfs`              |
| `45`     | ICON 13 km    | `om_icon`             |
| `59`     | GDPS 15 km    | `om_gdps`             |
| `117`    | IFS-HRES 9 km | `om_ifs`              |

## Local Development

### Prerequisites:

- Node.js, pnpm

### Setup:

```bash
pnpm install
cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env` for local free-text configuration and in the Vercel project environment for deployment. Create a boolean Vercel Flag named `free-text-config-builder`, then run `vercel link && vercel env pull` to evaluate it locally. The key and flag credentials are server-only; never expose them through a `VITE_` variable. Manual configuration works without either.

### Product analytics

Set both `VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST` locally and in Vercel to enable PostHog. The host is required and must be the project's explicit HTTPS regional ingestion host; there is no fallback host. Without either valid setting, analytics is a no-op. The SDK loads asynchronously only after configuration is validated. The integration sends only explicit events, creates no person profiles or persistent identity, and uses an in-memory anonymous transport identity because persistence is disabled. It also disables attribution, autocapture, pageviews, pageleaves, session recording, surveys, feature flags, heatmaps, performance, and exception capture. Each event is rebuilt from an event-specific property allowlist before it is sent.

In PostHog, go to **Settings > Project > General > IP data capture configuration** and select **Discard IP data**. This is a required dashboard setting because the browser SDK cannot disable ingestion-time IP capture. Keep project autocapture and session replay disabled as defense in depth.

Create an activation insight or funnel with either `subscription clicked` or `ics downloaded` as the observable activation proxy. These events prove that the user clicked a provider link or completed a browser download, not that a provider successfully created or refreshed a subscription. Do not count page visits, `url copied`, or share actions as activation. A useful funnel is `forecast loaded` -> `configuration changed` -> (`subscription clicked` or `ics downloaded`), broken down by subscription `provider` where relevant. The tracked taxonomy is:

- `forecast loaded`: emitted once for each successful forecast network response, with safe aggregate `session_count` and `data_source`
- `configuration changed`: `field` and `source` only; never values, locations, URLs, or free-text prompts
- `subscription clicked`: `provider` (`apple`, `google`, or `outlook`); captured before navigation
- `url copied`: only after the clipboard promise resolves successfully
- `ics downloaded`: after a valid calendar response is converted to a blob and its browser download link is clicked successfully
- `api error`: one event per failed request attempt, with endpoint, status group, and error type only; never raw messages. Existing React Query retries are preserved, so a logical query may emit multiple errors. Dashboard insights can count unique sessions when attempt volume is not the desired metric.

There is no WhatsApp share control in the app, so `WhatsApp share clicked` is intentionally not instrumented. Add the event only when that product feature exists. Manual `.ics` feed failures are tracked, but later refresh failures inside external calendar clients are not visible to browser analytics.

**Run locally:**

```bash
# Frontend only (port 5173)
pnpm dev

# Fullstack (Vite + API functions)
pnpm dev:api

# Check everything (format + lint + typecheck + test)
pnpm check
```

**Tooling:**

This project uses **oxc** (oxlint + oxfmt) for linting and formatting - **not ESLint or Prettier**.

```bash
# Format code
pnpm fmt

# Lint code
pnpm lint
pnpm lint:fix

# Run tests
pnpm test
```
