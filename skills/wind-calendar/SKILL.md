---
name: wind-calendar
description: Get wind forecast calendar feeds for windsurfing and kitesurfing spots in Israel. Returns ICS calendar feeds with sessions filtered by wind speed, wave height, and duration. Use when users want to add wind forecasts to their calendar, check upcoming good wind days, find optimal windsurfing/kitesurfing conditions, or subscribe to automated wind session alerts. Triggers on "wind forecast", "windsurfing", "kitesurfing", "wind calendar", "wind conditions", "good wind days", "when is good wind", or mentions of Israeli beach spots (Beit Yanai, Herzliya, Tel Aviv, Bat Galim).
---

# Wind Calendar

Generate calendar feeds for windsurfing and kitesurfing sessions based on wind forecasts.

## What This Skill Does

This skill provides access to an API that generates calendar feeds (ICS format) for windsurfing and kitesurfing sessions. The API:

- Fetches wind forecasts from Windguru for Israeli Mediterranean coast locations
- Filters sessions based on customizable wind speed, wave height, and duration thresholds
- Groups consecutive hours of good conditions into sessions
- Returns standard ICS calendar format compatible with all calendar applications
- Auto-updates every 6 hours with fresh forecast data

The calendar feeds can be subscribed to in Apple Calendar, Google Calendar, Outlook, or any other calendar app that supports ICS subscriptions.

## When to Use This Skill

Use this skill when:

- User wants to add wind forecasts to their calendar
- User asks about upcoming good wind conditions or "when is good wind"
- User mentions windsurfing, kitesurfing, or wind sports activities
- User asks about wind conditions at specific Israeli beach locations
- User wants automated alerts for optimal wind sessions
- User wants to subscribe to ongoing wind forecasts

## Available Locations

The API currently supports these Israeli Mediterranean coast locations:

- `beit-yanai` - Mediterranean coast, north of Netanya
- `herzliya` - Popular Tel Aviv area spot
- `tel-aviv` - Central location, urban beach
- `bat-galim` - Haifa area spot

## API Endpoint

```
https://wind-calendar.vercel.app/api/calendar
```

## Query Parameters

### Required

- `location` - One of: `beit-yanai`, `herzliya`, `tel-aviv`, `bat-galim`

### Optional

- `windMin` - Minimum wind speed in knots (default: 14)
- `windMax` - Maximum wind speed in knots (default: 35)
- `minSessionHours` - Minimum session duration in hours (default: 2)
- `waveHeightMin` - Minimum wave height in meters (default: 0.4)

### Parameter Constraints

- `windMin` must be >= 0
- `windMax` must be <= 200
- `windMin` must be < `windMax`
- `minSessionHours` must be between 0 and 24

## Example URL Construction

### Basic Usage

```
https://wind-calendar.vercel.app/api/calendar?location=herzliya
```

This uses default thresholds: 14-35kn wind, 2+ hour sessions, 0.4m+ waves.

### Customized for Stronger Winds

```
https://wind-calendar.vercel.app/api/calendar?location=beit-yanai&windMin=18&windMax=30&minSessionHours=3
```

This filters for stronger, longer sessions.

### Beginner-Friendly Settings

```
https://wind-calendar.vercel.app/api/calendar?location=tel-aviv&windMin=10&windMax=20&minSessionHours=1
```

This shows lighter wind sessions suitable for beginners.

## Response Format

The API returns:

- **Content-Type**: `text/calendar; charset=utf-8`
- **Format**: Standard ICS (RFC 5545)
- **Cache-Control**: 6-hour caching with stale-while-revalidate

Each calendar event represents a wind session with:

- **Summary**: "Wind 14-22kn NW | 0.8m waves"
- **Start/End Time**: In local timezone (Asia/Jerusalem)
- **Description**: Hourly breakdown of conditions (wind speed, gusts, direction)

Example event:

```
SUMMARY: Wind 14-22kn NW | 0.8m waves
DTSTART: 20260305T100000Z
DTEND: 20260305T160000Z
DESCRIPTION: 12:00  14kn  gusts 16kn  NW
             14:00  18kn  gusts 22kn  NW
             16:00  16kn  gusts 19kn  NW
```

## How to Subscribe to the Calendar

Guide users through platform-specific subscription methods:

### Apple Calendar (macOS/iOS)

1. Copy the API URL (starting with `https://`)
2. Replace `https://` with `webcal://`
3. Open the `webcal://` URL in Safari
4. Calendar app will open and prompt to subscribe

**Example:**

```
webcal://wind-calendar.vercel.app/api/calendar?location=herzliya
```

**Sync Frequency**: Apple Calendar typically syncs subscribed calendars every ~15 minutes.

### Google Calendar

1. Open Google Calendar in a web browser
2. Click the "+" next to "Other calendars"
3. Select "From URL"
4. Paste the `https://` URL (NOT `webcal://`)
5. Click "Add calendar"

**Important**: Google Calendar syncs subscribed calendars slowly (every 12-24 hours). This cannot be changed by the user.

### Outlook

1. In Outlook, go to File → Account Settings → Internet Calendars
2. Click "New"
3. Paste the `https://` URL
4. Click OK

**Sync Frequency**: Outlook typically syncs subscribed calendars every ~12 hours.

### Direct Download

Users can also download a one-time snapshot:

1. Open the URL in any web browser
2. The browser will download a `.ics` file
3. Double-click to import into any calendar app

Note: Downloaded files don't auto-update. Subscriptions are recommended for ongoing forecasts.

## What Sessions Look Like

Wind sessions are filtered and grouped based on the specified parameters. Each session includes:

- **Title**: Summarizes wind range, dominant direction, and average wave height
- **Time Range**: Start and end times in Asia/Jerusalem timezone
- **Detailed Conditions**: Hourly breakdown in the event description
- **Daylight Only**: Sessions are filtered to daylight hours based on sunrise/sunset times

Sessions are created by:

1. Filtering forecast hours by wind speed, wave height thresholds
2. Grouping consecutive hours (within 3-hour gaps)
3. Keeping only groups that meet the minimum duration requirement

## Update Frequency

- **Forecast Data**: Updated every 6 hours from Windguru
- **API Cache**: Responses cached for 6 hours
- **Calendar Sync**: Depends on the calendar application (see platform sections above)

When the forecast updates, subscribed calendars will automatically receive the new data on their next sync cycle.

## Important Limitations

- **Forecast Accuracy**: Forecasts come from Windguru and are subject to typical weather prediction limitations
- **Geographic Coverage**: Currently limited to Israeli Mediterranean coast locations
- **Daylight Hours Only**: Sessions are filtered to occur during daylight (based on sunrise/sunset)
- **Timezone**: All times are in Asia/Jerusalem timezone
- **Sync Delays**: Calendar app sync frequencies vary (Google Calendar is the slowest)

## Example Agent Workflows

### Workflow 1: Basic Calendar Subscription

**User**: "Add windsurfing forecasts for Herzliya to my calendar"

**Agent Actions**:

1. Construct URL: `https://wind-calendar.vercel.app/api/calendar?location=herzliya`
2. Detect user's platform (if possible) or provide all options
3. For Apple users, provide webcal URL: `webcal://wind-calendar.vercel.app/api/calendar?location=herzliya`
4. Explain: "This will show upcoming wind sessions with 14-35 knot winds, minimum 2-hour duration, updating automatically every 6 hours"

### Workflow 2: Custom Wind Thresholds

**User**: "When is good wind at Beit Yanai this week? I need at least 18 knots"

**Agent Actions**:

1. Construct customized URL: `https://wind-calendar.vercel.app/api/calendar?location=beit-yanai&windMin=18`
2. Provide subscription instructions based on user's platform
3. Explain: "This calendar will show sessions with 18+ knot winds. The forecast updates automatically, so you'll always see the latest predictions"

### Workflow 3: Kitesurfing-Specific Requirements

**User**: "I want kite forecasts for Tel Aviv but only strong wind days, at least 3 hours long"

**Agent Actions**:

1. Construct URL for longer, stronger sessions: `https://wind-calendar.vercel.app/api/calendar?location=tel-aviv&windMin=20&windMax=35&minSessionHours=3`
2. Provide subscription instructions
3. Explain: "This filters for sustained strong wind sessions (20-35 knots, 3+ hours) ideal for kitesurfing"

### Workflow 4: Beginner Windsurfer

**User**: "I'm learning to windsurf in Herzliya, what days will have light winds?"

**Agent Actions**:

1. Construct URL for lighter winds: `https://wind-calendar.vercel.app/api/calendar?location=herzliya&windMin=8&windMax=15&minSessionHours=1`
2. Provide subscription instructions
3. Explain: "This shows gentler wind sessions (8-15 knots) perfect for learning"

### Workflow 5: Comparing Multiple Spots

**User**: "Which spot has better wind this weekend - Herzliya or Beit Yanai?"

**Agent Actions**:

1. Generate URLs for both locations
2. Suggest subscribing to both calendars with different names/colors
3. Or: Offer to fetch both ICS files and compare upcoming sessions
4. Explain: "You can subscribe to both and see them side-by-side in your calendar"

## Troubleshooting

### No Sessions Appearing

If a subscribed calendar shows no events:

- Wind conditions may not meet the threshold criteria
- Try lowering `windMin` or `minSessionHours` parameters
- Check that the location name is spelled correctly (exact match required)

### Calendar Not Updating

If forecasts seem stale:

- Check the calendar app's sync settings
- Google Calendar has the longest delay (12-24 hours)
- Try manually refreshing the calendar in the app
- For Apple Calendar, force refresh by removing and re-adding the subscription

### Invalid Location Error

Location names must exactly match (case-sensitive):

- `beit-yanai` (not "beit yanai" or "Beit-Yanai")
- `herzliya` (not "Herzliya")
- `tel-aviv` (not "tel aviv" or "Tel-Aviv")
- `bat-galim` (not "bat galim")

### Parameter Errors

If the API returns an error about invalid parameters:

- Ensure `windMin` < `windMax`
- Check that `windMin` >= 0 and `windMax` <= 200
- Verify `minSessionHours` is between 0 and 24
- All numeric parameters must be valid numbers
