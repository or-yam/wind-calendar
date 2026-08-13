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

## Vercel Observability

The app uses Vercel Web Analytics and Speed Insights in the browser. Both integrations remove query strings before sending page URLs because calendar configuration is URL-driven. The main forecast, calendar, and free-text handlers emit a structured JSON record when they throw a server error. These records contain only a fixed route, method, generated request ID, and error type; they omit request bodies, prompts, IPs, query values, raw error messages, and timing or final-response claims. Routine client validation errors are not duplicated in application logs. Provider fallback warnings also use fixed fields instead of coordinates or upstream error messages.

### Dashboard setup

1. In the Vercel project dashboard, open **Speed Insights**, click **Enable**, and deploy again. Vercel provisions the first-party `/_vercel/speed-insights/*` and deployment-specific resilient-intake routes on that deployment.
2. Visit the deployed app, then navigate away or blur/close the tab so vitals are sent. Data appears under **Speed Insights** after traffic arrives; ad blockers and reverse proxies can block collection.
3. Open **Logs** for Runtime Logs. Filter by route, status, environment, or log level, and search `api_request_failed` or an origin response's `X-Request-ID`. Vercel also groups each JSON line with its function invocation and platform Request ID.

`X-Request-ID` correlates application logs produced during one Nitro/Vercel Function invocation. It is not Vercel's platform Request ID. CDN-cached responses do not invoke Nitro or produce application logs, and may replay the ID stored with the cached origin response, so do not treat this header as unique per viewer request. Use Vercel's Runtime Logs request metadata for platform-level request correlation and final status/duration.

No runtime observability environment variables or external services are required.

### Hobby limits

As of August 2026, Hobby includes Speed Insights for one project with up to 10,000 events per month and a 7-day reporting window. Recording pauses after the event cap is reached. Hobby Runtime Logs retain only one hour of logs. Vercel also limits each request to 256 log lines, 256 KB per line, and 1 MB total, so this integration logs only server failures and significant provider warnings rather than every successful request. Speed Insights client collection also consumes Edge Requests and data transfer.

Current Vercel references: [Speed Insights quickstart](https://vercel.com/docs/speed-insights/quickstart), [Speed Insights limits](https://vercel.com/docs/speed-insights/limits-and-pricing), and [Runtime Logs](https://vercel.com/docs/logs/runtime).
