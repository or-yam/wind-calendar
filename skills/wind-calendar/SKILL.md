---
name: wind-calendar
description: Fetch upcoming wind and wave forecast sessions for supported Israeli windsurfing and kitesurfing spots, compare spots or forecast models, and provide calendar subscription links. Use for forecast or subscription requests at these spots; not for general windsurfing advice.
---

# Wind Calendar

Use the public API at `https://wind-calendar.vercel.app`. No API key is required.
The website supports Hebrew and English; API location IDs and parameter names stay in English.

## Display forecasts

1. Map the user's spot to a supported location ID. Ask for a spot if none is specified or clear from context.
2. Fetch `GET /api/forecast` with the user's conditions. This returns JSON and uses the same filters as the calendar feed.
3. Display returned sessions with their spot, date, time range, wind range, gusts, direction, and available wave or swell data. Use the user's language.
4. Offer a matching `/api/calendar` subscription link when useful. A request only for a subscription can go straight to that link.

Read live results before describing upcoming sessions. An empty `sessions` array means no matching forecast sessions; it does not mean the service failed or there is no wind.

Forecast timestamps are UTC ISO strings. Display them in `Asia/Jerusalem` unless the user requests another timezone, and label the timezone. Use timezone-aware conversion for daylight saving time.

### JSON response

- `meta`: `locations`, `model`, `dataSource`, per-location `dataSources`, and `generatedAt` (response generation time, not the weather model's run time).
- `sessions[]`: `location` (`id`, `label`), `start`, `end`, and `matchType` (`wind`, `wave`, or `both`).
- Each session has `wind` (`min`, `max`, `gustMax`, `direction`), `wave` (`avgHeight`, `avgPeriod`, `direction`), `swell` (`avgHeight`, `avgPeriod`), and `hourly[]`.
- Hourly entries include `time`, `windSpeed`, `windGusts`, `windDirection`, `windDirectionDeg`, `waveHeight`, `wavePeriod`, `waveDirection`, `swellHeight`, and `swellPeriod`.
- Units: knots for wind/gusts, meters for wave/swell height, seconds for periods. Hourly weather values can be `null`. Session wave/swell aggregates can be zero when data is missing; inspect hourly availability before claiming calm conditions.

## Supported locations

Use these exact IDs. Coverage includes the Mediterranean coast, Eilat, and Kinneret:

| ID               | Spot                      |
| ---------------- | ------------------------- |
| `ashkelon`       | Ashkelon                  |
| `atlit`          | Atlit                     |
| `bat-galim`      | Bat Galim (Haifa)         |
| `bat-yam`        | Bat Yam                   |
| `beit-yanai`     | Beit Yanai                |
| `bezet`          | Bezet (Rosh Hanikra)      |
| `caesarea`       | Caesarea                  |
| `eilat`          | Eilat                     |
| `hadera`         | Hadera                    |
| `herzliya`       | Herzliya                  |
| `kiryat-yam`     | Kiryat Yam                |
| `maagan-michael` | Maagan Michael            |
| `naharia`        | Naharia                   |
| `sea-of-galilee` | Kinneret / Sea of Galilee |
| `shave-ziyyon`   | Shave Ziyyon              |
| `tel-aviv`       | Tel Aviv                  |
| `zichron`        | Zichron Yaakov            |

## API parameters

Both `/api/forecast` (JSON) and `/api/calendar` (ICS) accept these query parameters:

| Parameter         | Default      | Meaning / constraints                                                       |
| ----------------- | ------------ | --------------------------------------------------------------------------- |
| `locations`       | `beit-yanai` | One to three comma-separated location IDs; order breaks ranking ties        |
| `location`        | —            | Legacy single-spot alternative; `locations` takes precedence                |
| `model`           | `om_icon`    | Forecast model ID, listed below                                             |
| `minSessionHours` | `1`          | Minimum grouped session duration, 0–24 hours                                |
| `windEnabled`     | `true`       | Enable wind qualification; use literal `true` or `false`                    |
| `windMin`         | `14`         | Minimum sustained wind in knots, at least 0                                 |
| `windMax`         | `35`         | Maximum sustained wind in knots, at most 200; greater than `windMin`        |
| `waveEnabled`     | `false`      | Enable wave qualification; use literal `true` or `false`                    |
| `waveSource`      | `total`      | `total` for total waves or `swell` for swell                                |
| `waveHeightMin`   | `0.5`        | Minimum selected wave/swell height in meters, at least 0                    |
| `waveHeightMax`   | `3`          | Maximum selected height in meters, at most 20; greater than `waveHeightMin` |
| `wavePeriodMin`   | `0`          | Minimum selected wave/swell period in seconds, at least 0                   |

Numeric bounds are validated even when the associated filter is disabled. Enable at least one filter to get matching sessions.

Models: `om_icon` (DWD ICON), `om_gfs` (NOAA GFS), `om_gdps` (CMC GDPS), `om_ifs` (ECMWF IFS). Legacy numeric IDs `45`, `3`, `59`, and `117`, respectively, request Windguru directly. Open-Meteo requests can fall back to the corresponding Windguru model; inspect `meta.dataSources` or `X-Data-Source` and `X-Fallback-Used` to identify the actual source. Model performance varies by spot and conditions.

### Filtering semantics

- **Wind and waves use OR.** With both enabled, a forecast hour qualifies if it passes the wind range **or** the selected wave height/period thresholds. `matchType` identifies which passed. Enabling waves does not add a mandatory wave constraint to wind matches.
- For wave-only results, set `windEnabled=false&waveEnabled=true`. Missing wave data cannot qualify as a wave match; wind matches can still appear when wind is enabled.
- There is no API parameter for requiring wind AND waves, filtering wind direction, or limiting gusts. If asked for both wind and wave requirements, explain the subscription limitation; a separate analysis can filter the returned hourly data for both.
- Only future daylight forecast samples qualify. Grouped sessions are clipped to each day's sunrise/sunset bounds before minimum-duration checks. The Open-Meteo forecast horizon is seven days.
- Multiple locations produce one ranked feed, keeping one spot per overlapping forecast timestamp. Wind matches rank by sustained wind when wind is enabled; wave matches rank by the selected height when waves are enabled; location order breaks remaining ties. Sessions are regrouped and minimum duration reapplied after selection.
- To compare all opportunities at different spots, fetch each spot separately. A combined feed omits losing overlaps.

### Examples

Display Herzliya sessions with current defaults (14–35 knots, minimum one hour):

```text
https://wind-calendar.vercel.app/api/forecast?locations=herzliya
```

Subscribe to stronger wind sessions from up to three spots:

```text
https://wind-calendar.vercel.app/api/calendar?locations=herzliya,beit-yanai,tel-aviv&model=om_icon&windMin=18&windMax=30&minSessionHours=2
```

Display swell-only sessions, at least 0.8 meters with a period of at least eight seconds:

```text
https://wind-calendar.vercel.app/api/forecast?locations=herzliya&windEnabled=false&waveEnabled=true&waveSource=swell&waveHeightMin=0.8&wavePeriodMin=8
```

Display sessions with either 20–35 knot wind or total waves of 1–3 meters:

```text
https://wind-calendar.vercel.app/api/forecast?locations=tel-aviv&windMin=20&windMax=35&waveEnabled=true&waveHeightMin=1&waveHeightMax=3
```

For model comparisons, fetch the same single spot and thresholds separately with `model=om_ifs` and `model=om_gfs`.

## Calendar subscriptions

Build a full HTTPS `/api/calendar` URL with the agreed query parameters. Keep explicit settings in the URL when the user wants a fixed configuration. Provide the URL and the appropriate setup instructions; claim a subscription was added only after observing completion.

- **Apple Calendar:** replace `https://` with `webcal://` and open the link to start subscription setup. Refresh behavior depends on device and settings. On Mac, Auto-refresh is configurable.
- **Google Calendar:** on a computer browser, open Google Calendar → Other calendars **+** → From URL → paste the HTTPS feed URL → Add calendar. The mobile Calendar apps cannot create this subscription. See [Google's instructions](https://support.google.com/calendar/answer/37100).
- **Outlook on the web:** Calendar → Add calendar → Subscribe from web → paste the HTTPS feed URL and complete setup. Updates can take more than 24 hours. See [Microsoft's instructions](https://support.microsoft.com/en-au/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web).
- **One-time import:** save the HTTPS response as `.ics` and import it. Imported snapshots do not receive forecast updates.

The service caches responses for six hours and allows stale responses during revalidation or upstream errors. This is not a scheduled refresh guarantee: calendar clients control polling and may lag substantially. Model publication schedules also vary.

A subscription keeps the URL originally added. Changing website settings or generating another URL does not update that subscription's filters. Replace the subscribed URL where supported, or remove the old subscription and add the new one. Omitted parameters follow the service's defaults, which may change.

### ICS details

The calendar response is `text/calendar; charset=utf-8`. Each `VEVENT` has a spot-specific `SUMMARY`, UTC `DTSTART`/`DTEND` (ending in `Z`), and a `DESCRIPTION` containing the spot and local hourly conditions. Titles vary with `matchType`; wave height is not always present in the title. Unfold continuation lines and decode ICS text escapes before interpreting fields. Calendar apps convert event timestamps to their display timezone; description times use the spot's `Asia/Jerusalem` timezone.

## Errors and interpretation

- **400:** read the validation error and correct the location, model, or parameter ranges.
- **429:** respect `Retry-After`; avoid repeated immediate requests.
- **Upstream failure / 5xx:** report forecast unavailability, rather than interpreting the failure as no matching sessions.
- **No matches:** report the active filters and offer to relax them; change thresholds only when consistent with the user's request.

These are forecast windows, not guarantees of suitable conditions. Describe the returned wind direction and gusts when relevant, without labeling speed-only matches as safe or ideal for a particular rider.

Weather data is provided by [Open-Meteo](https://open-meteo.com/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and, when used, [Windguru](https://www.windguru.cz/). Retain source attribution when presenting results.
