import type { VercelRequest, VercelResponse } from "@vercel/node";

import type { CalendarConfig } from "../shared/types.js";
import { parseQueryParams, resolveLocation } from "../server/config.js";
import { fetchWindData } from "../server/windguru/api.js";
import { filterEvents } from "../server/utils/filterEvents.js";
import { groupSessions } from "../server/utils/groupSessions.js";
import { generateIcsEvents } from "../server/utils/generateIcsEvents.js";
import { checkRateLimit } from "../server/utils/rate-limit.js";
import {
  isDev,
  getClientIp,
  setDevCors,
  resolveForecastData,
} from "../server/utils/api-handler.js";

function buildCalendar(
  fetchResult: Awaited<ReturnType<typeof fetchWindData>>,
  config: CalendarConfig,
  tz: string,
): string {
  const { conditions, matchReasons } = filterEvents(fetchResult.windData, {
    windEnabled: config.windEnabled,
    windMin: config.windMin,
    windMax: config.windMax,
    waveEnabled: config.waveEnabled,
    waveSource: config.waveSource,
    waveHeightMin: config.waveHeightMin,
    waveHeightMax: config.waveHeightMax,
    wavePeriodMin: config.wavePeriodMin,
    sunrise: fetchResult.sunrise,
    sunset: fetchResult.sunset,
    tz,
  });

  const sessions = groupSessions(conditions, matchReasons, config.minSessionHours);
  return generateIcsEvents(sessions, tz);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!req.url) {
    return res.status(400).json({ error: "Missing request URL" });
  }
  const url = new URL(req.url, `http://${req.headers.host}`);

  const dev = isDev();
  if (dev) {
    setDevCors(res);
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
  }

  const rateCheck = checkRateLimit(getClientIp(req));
  if (rateCheck.limited) {
    res.setHeader("Retry-After", rateCheck.retryAfter.toString());
    return res.status(429).json({
      error: "Too many requests",
      code: "RATE_LIMITED",
      suggestion: `Try again in ${rateCheck.retryAfter} seconds`,
    });
  }

  let config: CalendarConfig;
  try {
    config = parseQueryParams(url.searchParams);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: message });
  }

  const location = resolveLocation(config.location);
  const result = await resolveForecastData(config, location, dev);

  if (result.success === false) {
    return res.status(result.status).json(result.body);
  }

  const { fetchResult, dataSource, fallbackUsed } = result;

  let icsString;
  try {
    icsString = buildCalendar(fetchResult, config, location.tz);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: "Failed to generate calendar",
      code: "PIPELINE_ERROR",
      ...(dev && {
        debug: {
          message,
          spotId: location.spotId,
          location: config.location,
        },
      }),
    });
  }

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("X-Data-Source", dataSource);
  if (fallbackUsed) {
    res.setHeader("X-Fallback-Used", "true");
  }
  res.setHeader(
    "Cache-Control",
    "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
  );
  res.setHeader("Content-Disposition", `inline; filename="wind-forecast-${config.location}.ics"`);
  return res.status(200).send(icsString);
}
