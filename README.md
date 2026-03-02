# Wind Calendar

Generate windsurfing calendar feeds from Windguru forecasts. Subscribe to filtered wind forecasts for your preferred spots and get notifications when conditions are good.

Check it out on [wind-calendar](https://wind-calendar.vercel.app)

## For AI Agents

This project provides a public API for wind forecast calendar feeds. AI agents can discover this functionality via the OpenCode skill located at `skills/wind-calendar/SKILL.md`.

**Quick Example**:

```
https://wind-calendar.vercel.app/api/calendar?location=herzliya&windMin=14
```

Returns an ICS calendar feed with windsurfing/kitesurfing sessions filtered by wind conditions.

## How It Works

1. Fetch - Pulls wind and wave forecast data from Windguru API
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

| Parameter         | Type   | Default      | Description                                               |
| ----------------- | ------ | ------------ | --------------------------------------------------------- |
| `location`        | string | `beit-yanai` | One of: `beit-yanai`, `bat-galim`, `herzliya`, `tel-aviv` |
| `windMin`         | number | `14`         | Minimum wind speed in knots (>= 0)                        |
| `windMax`         | number | `35`         | Maximum wind speed in knots (<= 200)                      |
| `minSessionHours` | number | `2`          | Minimum session duration in hours (0-24)                  |

**Example API request:**

```bash
curl "https://wind-calendar.vercel.app/api/calendar?location=beit-yanai&windMin=14&windMax=35&minSessionHours=2"
```

**Subscribe in calendar apps:**

```
webcal://wind-calendar.vercel.app/api/calendar?location=beit-yanai&windMin=14&windMax=35&minSessionHours=2
```

Replace `https://` with `webcal://` and paste into your calendar app (Apple Calendar, Google Calendar, etc.)

The UI provides a human-friendly way to configure parameters and preview upcoming sessions. However, the calendar feed can be accessed directly via the API endpoint - the UI is optional for better UX.

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
