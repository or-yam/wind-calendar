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
- Multiple forecast models - Choose from GFS, ICON, GDPS, or IFS-HRES weather models
- Session grouping - Automatically merges consecutive forecast hours into surf sessions
- Calendar integration - Subscribe via standard ICS/webcal protocol (works with all major calendar apps)
- Israeli surf spots - Pre-configured for Beit Yanai, Bat Galim, Herzliya, and More

---

## Quick Start

**Web Interface (Recommended)**  
Visit [wind-calendar.vercel.app](https://wind-calendar.vercel.app) to configure your preferences and get a subscription link.

**Direct API**  
Construct a URL and subscribe by replacing `https://` with `webcal://`:

```
webcal://wind-calendar.vercel.app/api/calendar?location=herzliya&windMin=14&model=om_gfs
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
https://wind-calendar.vercel.app/api/calendar?location=herzliya&windMin=14
```

Returns an ICS calendar feed with windsurfing/kitesurfing sessions filtered by wind conditions.

---

## How It Works

1. Fetch - Pulls wind and wave forecast data from Open-Meteo (primary) or [Windguru](https://www.windguru.cz/) (fallback)
2. Filter - Removes forecasts outside your wind speed range, during darkness, or below minimum wave height
3. Group - Merges adjacent hourly forecasts into sessions (max 3-hour gap between points)
4. Generate - Creates ICS calendar events with session details (wind range, gusts, direction, waves)

### Filtering Logic

- Wind speed must be within `windMin` to `windMax` range (note: gusts are NOT capped by windMax)
- Forecast must be during daylight hours (timezone-aware using spot's IANA timezone)
- Wave height must be >= `waveHeightMin` (if wave data available)
- Grouped sessions must be >= `minSessionHours` duration

---

## Config Options

### API Query Parameters

| Parameter         | Type           | Default      | Description                                               |
| ----------------- | -------------- | ------------ | --------------------------------------------------------- |
| `location`        | string         | `beit-yanai` | One of: `beit-yanai`, `bat-galim`, `herzliya`, `tel-aviv` |
| `windMin`         | number         | `14`         | Minimum wind speed in knots (>= 0)                        |
| `windMax`         | number         | `35`         | Maximum wind speed in knots (<= 200)                      |
| `minSessionHours` | number         | `2`          | Minimum session duration in hours (0-24)                  |
| `model`           | string, number | `om_gfs`     | Forecast model (see below)                                |

### Example API Request

```bash
curl "https://wind-calendar.vercel.app/api/calendar?location=beit-yanai&windMin=14&windMax=35&minSessionHours=2&model=om_gfs"
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
```

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
