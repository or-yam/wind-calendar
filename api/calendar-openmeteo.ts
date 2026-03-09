/**
 * Open-Meteo calendar endpoint (isolated from Windguru flow).
 * Endpoint: /api/calendar-openmeteo?location=tel-aviv&model=gfs_global
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  parseOpenMeteoQueryParams,
  resolveOpenMeteoLocation,
} from "../server/open-meteo/config.js";
import { fetchOpenMeteoData } from "../server/open-meteo/forecast.js";
import { OPEN_METEO_MODELS } from "../server/open-meteo/models.js";
import { tryCatch } from "../server/utils/try-catch.js";
import { filterEvents } from "../server/utils/filterEvents.js";
import { groupSessions } from "../server/utils/groupSessions.js";
import { generateIcsEvents } from "../server/utils/generateIcsEvents.js";
import { checkRateLimit } from "../server/utils/rate-limit.js";
import { isDev, getClientIp, setDevCors, classifyFetchError } from "../server/utils/api-handler.js";

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

  let config;
  try {
    config = parseOpenMeteoQueryParams(url.searchParams);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: message });
  }

  let location;
  try {
    location = resolveOpenMeteoLocation(config.location);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: message });
  }

  const modelSlug = OPEN_METEO_MODELS[config.model].id;

  if (dev) {
    console.log(
      `[Open-Meteo] Fetching data for ${config.location} (${location.coordinates.lat}, ${location.coordinates.lon}) with model ${modelSlug}`,
    );
  }

  const { data: fetchResult, error: fetchError } = await tryCatch(
    fetchOpenMeteoData(location.coordinates.lat, location.coordinates.lon, modelSlug, location.tz),
  );

  if (fetchError) {
    const { status, body } = classifyFetchError(
      fetchError,
      "openmeteo",
      `location=${config.location}, model=${modelSlug}`,
      dev,
    );
    return res.status(status).json(body);
  }

  let icsString;
  try {
    const { conditions, matchReasons } = filterEvents(fetchResult.windData, {
      windEnabled: true,
      windMin: config.windMin,
      windMax: config.windMax,
      waveEnabled: false,
      waveSource: "total",
      waveHeightMin: config.waveHeightMin,
      waveHeightMax: 5.0,
      wavePeriodMin: 0,
      sunrise: fetchResult.sunrise,
      sunset: fetchResult.sunset,
      tz: location.tz,
    });

    const sessions = groupSessions(conditions, matchReasons, config.minSessionHours);
    icsString = generateIcsEvents(sessions, location.tz);

    if (dev) {
      console.log(
        `[Open-Meteo] Generated calendar with ${sessions.length} sessions for ${config.location}`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: "Failed to generate calendar",
      code: "PIPELINE_ERROR",
      ...(dev && {
        debug: {
          message,
          location: config.location,
          model: config.model,
        },
      }),
    });
  }

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("X-Data-Source", "openmeteo");
  res.setHeader(
    "Cache-Control",
    "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
  );
  res.setHeader(
    "Content-Disposition",
    `inline; filename="wind-forecast-${config.location}-openmeteo.ics"`,
  );

  return res.status(200).send(icsString);
}
