# Wind Calendar

Generate windsurfing calendar feeds from weather forecasts. Subscribe to filtered wind forecasts for your preferred spots and get notifications when conditions are good.

Check it out on [wind-calendar](https://wind-calendar.vercel.app)

## For AI Agents

This project provides a public API for wind forecast calendar feeds. AI agents can discover this functionality via the OpenCode skill located at `skills/wind-calendar/SKILL.md`.

**Quick Example**:

```
https://wind-calendar.vercel.app/api/calendar?location=herzliya&windMin=14
```

Returns an ICS calendar feed with windsurfing/kitesurfing sessions filtered by wind conditions.

## How It Works

1. Fetch - Pulls wind and wave forecast data from Open-Meteo (primary) or Windguru (fallback)
2. Filter - Removes forecasts outside your wind speed range, during darkness, or below minimum wave height
3. Group - Merges adjacent hourly forecasts into sessions (max 3-hour gap between points)
4. Generate - Creates ICS calendar events with session details (wind range, gusts, direction, waves)

The filtering logic:

- Wind speed must be within `windMin` to `windMax` range (note: gusts are NOT capped by windMax)
- Forecast must be during daylight hours (timezone-aware using spot's IANA timezone)
- Wave height must be >= `waveHeightMin` (if wave data available)
- Grouped sessions must be >= `minSessionHours` duration

## Config Options

API query parameters:

| Parameter         | Type           | Default      | Description                                               |
| ----------------- | -------------- | ------------ | --------------------------------------------------------- |
| `location`        | string         | `beit-yanai` | One of: `beit-yanai`, `bat-galim`, `herzliya`, `tel-aviv` |
| `windMin`         | number         | `14`         | Minimum wind speed in knots (>= 0)                        |
| `windMax`         | number         | `35`         | Maximum wind speed in knots (<= 200)                      |
| `minSessionHours` | number         | `2`          | Minimum session duration in hours (0-24)                  |
| `model`           | string, number | `om_gfs`     | Forecast model (see below)                                |

**Example API request:**

```bash
curl "https://wind-calendar.vercel.app/api/calendar?location=beit-yanai&windMin=14&windMax=35&minSessionHours=2&model=om_gfs"
```

**Subscribe in calendar apps:**

```
webcal://wind-calendar.vercel.app/api/calendar?location=beit-yanai&windMin=14&windMax=35&minSessionHours=2&model=om_gfs
```

## Forecast Models

### Open-Meteo (Recommended)

Primary provider using open-source weather data from government agencies:

| Model ID  | Model Name    | Description                                     |
| --------- | ------------- | ----------------------------------------------- |
| `om_gfs`  | GFS 13 km     | NOAA Global Forecast System (default, reliable) |
| `om_icon` | ICON 13 km    | DWD German model (excellent for Europe/Med)     |
| `om_gdps` | GDPS 15 km    | Canadian Meteorological Centre global model     |
| `om_ifs`  | IFS-HRES 9 km | ECMWF high-resolution (often most accurate)     |

**Data source:** [Open-Meteo.com](https://open-meteo.com/) (CC-BY 4.0 license)  
**Fallback:** If Open-Meteo fails, automatically falls back to equivalent Windguru model

### Windguru (Legacy)

Legacy provider supported for backward compatibility:

| Model ID | Model Name    | Open-Meteo Equivalent |
| -------- | ------------- | --------------------- |
| `3`      | GFS 13 km     | `om_gfs`              |
| `45`     | ICON 13 km    | `om_icon`             |
| `59`     | GDPS 15 km    | `om_gdps`             |
| `117`    | IFS-HRES 9 km | `om_ifs`              |

**Note:** Existing calendar subscriptions using numeric model IDs continue to work. We recommend using Open-Meteo models for new subscriptions.

## Using the Calendar

**Option 1: Web Interface (Recommended)**  
Visit [wind-calendar.vercel.app](https://wind-calendar.vercel.app) to configure your forecast parameters and get a subscription link.

**Option 2: Direct API**  
Construct a URL manually and subscribe by replacing `https://` with `webcal://`:

```
webcal://wind-calendar.vercel.app/api/calendar?location=herzliya&windMin=14&model=om_gfs
```

Paste the `webcal://` URL into your calendar app (Apple Calendar, Google Calendar, Outlook, etc.) to subscribe.

## Data Sources & Attribution

- **Open-Meteo**: Primary provider using public weather model data (GFS, ICON, GDPS, IFS-HRES) from NOAA, DWD, CMC, and ECMWF. Data provided by [Open-Meteo.com](https://open-meteo.com/) under CC-BY 4.0 license.
- **Windguru**: Fallback provider for reliability when Open-Meteo is unavailable.

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
