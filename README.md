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

See the [backend flow diagrams](docs/backend-flows.html) and the [wind-or-waves example](docs/wind-or-waves.html). Open the HTML files in a browser for the interactive diagrams and questions.

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

Sentry is optional. Set `VITE_SENTRY_DSN` and `SENTRY_DSN` for browser and Nitro errors. Set `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` in Vercel to upload hidden browser and server source maps during builds. `SENTRY_ENVIRONMENT` only overrides the event's dashboard environment label; it does not enable or disable reporting. Reporting is gated independently by `VERCEL_ENV` and runs only on Vercel Preview and Production deployments. `SENTRY_RELEASE` is also optional; Vercel's environment and Git commit SHA are used as defaults. The SDKs do not initialize in tests or local development, and request bodies, query strings, headers, cookies, user data, IP addresses, AI inputs/outputs, and console breadcrumbs are not collected. DSNs must use HTTPS. When source-map upload credentials are configured, upload failures fail the build.

**Run locally:**

```bash
# Fullstack dev server (Vite + API routes)
pnpm dev

# Check everything (format + lint + typecheck + test)
pnpm check
```

`pnpm dev` serves the frontend and the API routes from one server (Vite plus the Nitro plugin). It prints its URL on startup, which `portless` may set per task.

Check switch thumb positioning in English and Hebrew at mobile and desktop widths using the
`agent-browser` CLI against a Vercel preview:

```bash
PREVIEW_URL=https://your-preview.vercel.app pnpm test:rtl
```

For protected previews, pass an authenticated `AGENT_BROWSER_SESSION`. The test overrides features
and forecast responses inside that browser to expose the wave switch without changing deployment flags.

To run the built output instead:

```bash
pnpm build
pnpm preview
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

## Production logs

Forecast, calendar, AI configuration, and feature-flag endpoints emit JSON logs to Vercel.
`request_completed` / `request_failed` record status and duration; provider requests record
host, path, operation, duration, and model/location identifiers where applicable. `provider_fallback` and `wave_data_unavailable`
are warnings. Terminal provider failures and unexpected exceptions are errors; invalid
requests and local rate limits are warnings. Expected 404/405 responses are info.
`model` is the requested application model; `providerModel` is the actual provider slug/ID.

Use the response's `X-Request-Id` to correlate application logs. It identifies the origin
invocation that generated the response; CDN cache hits can reuse that response and ID.
It is separate from Vercel's platform request ID.

```bash
pnpm exec vercel logs --project wind-calendar --environment production --level error --since 1h --expand
pnpm exec vercel logs --project wind-calendar --environment production --query 'warning' --since 1h --expand
pnpm exec vercel logs --project wind-calendar --environment production --query '<X-Request-Id>' --since 1h --expand
```

Warnings use stdout with a JSON `level: "warning"` field because Vercel maps stderr
warnings to errors for non-streaming functions. Use the message query above to find them;
the platform may display these individual log lines as info. HTTP 4xx/5xx requests can
still have a platform warning/error classification independently of application log level.

Logs preserve error tags and upstream statuses through internal cause chains. Error
messages, request bodies, headers, URL queries, and upstream response bodies are omitted;
unexpected errors include frame locations from the deployment bundle. Unexpected exceptions return a generic handled
500 response. Deployment logs include
`VERCEL_GIT_COMMIT_SHA` when available. Crash reporting and alerts are configured separately.

Run `pnpm test:production-logs` to build and verify request-ID headers through Nitro's
production error handler; the regular Vitest handler tests use bare H3.
