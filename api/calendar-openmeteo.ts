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

interface ErrorResponse {
  error: string;
  code?: string;
  suggestion?: string;
  debug?: Record<string, unknown>;
}

function classifyOpenMeteoError(
  error: Error,
  lat: number,
  lon: number,
  model: string,
  isDev: boolean,
): { status: number; body: ErrorResponse } {
  const debug: Record<string, unknown> = { lat, lon, model };

  // Check for Open-Meteo API error response format
  if (error.message.includes("Open-Meteo API error")) {
    return {
      status: 502,
      body: {
        error: "Open-Meteo API returned an error",
        code: "OPENMETEO_API_ERROR",
        suggestion: "Try again later or select a different model",
        ...(isDev && { debug: { ...debug, message: error.message } }),
      },
    };
  }

  // Network/timeout errors
  if (error.message.includes("timed out") || error.message.includes("Network error")) {
    return {
      status: 504,
      body: {
        error: "Could not reach Open-Meteo",
        code: "OPENMETEO_UNREACHABLE",
        suggestion: "Try again in a few minutes",
        ...(isDev && { debug: { ...debug, message: error.message } }),
      },
    };
  }

  // Missing data errors
  if (error.message.includes("Missing") || error.message.includes("Invalid")) {
    return {
      status: 502,
      body: {
        error: "Invalid response from Open-Meteo",
        code: "OPENMETEO_BAD_RESPONSE",
        suggestion: "The API response format may have changed",
        ...(isDev && { debug: { ...debug, message: error.message } }),
      },
    };
  }

  // Generic errors
  return {
    status: 502,
    body: {
      error: "Open-Meteo request failed",
      code: "FETCH_FAILED",
      suggestion: "Try again later",
      ...(isDev && { debug: { ...debug, message: error.message } }),
    },
  };
}

/**
 * Log raw API response for dev diagnostics.
 */
function logRawResponse(
  locationId: string,
  model: string,
  data: { windData: unknown; sunrise: string; sunset: string },
): void {
  console.log(
    `[Open-Meteo] Raw response for ${locationId} (${model}):`,
    JSON.stringify(
      {
        location: locationId,
        model,
        timestamp: new Date().toISOString(),
        data,
      },
      null,
      2,
    ),
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!req.url) {
    return res.status(400).json({ error: "Missing request URL" });
  }
  const url = new URL(req.url, `http://${req.headers.host}`);

  const isDev = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development";
  if (isDev) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
  }

  const clientIp =
    (Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) ??
    req.socket?.remoteAddress ??
    "unknown";

  const rateCheck = checkRateLimit(clientIp);
  if (rateCheck.limited) {
    res.setHeader("Retry-After", rateCheck.retryAfter.toString());
    return res.status(429).json({
      error: "Too many requests",
      code: "RATE_LIMITED",
      suggestion: `Try again in ${rateCheck.retryAfter} seconds`,
    });
  }

  // Parse query params
  let config;
  try {
    config = parseOpenMeteoQueryParams(url.searchParams);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: message });
  }

  // Resolve location with coordinates
  let location;
  try {
    location = resolveOpenMeteoLocation(config.location);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: message });
  }

  // Get model slug
  const modelSlug = OPEN_METEO_MODELS[config.model].id;

  console.log(
    `[Open-Meteo] Fetching data for ${config.location} (${location.coordinates.lat}, ${location.coordinates.lon}) with model ${modelSlug}`,
  );

  // Fetch Open-Meteo data
  const { data: fetchResult, error: fetchError } = await tryCatch(
    fetchOpenMeteoData(location.coordinates.lat, location.coordinates.lon, modelSlug, location.tz),
  );

  if (fetchError) {
    const { status, body } = classifyOpenMeteoError(
      fetchError,
      location.coordinates.lat,
      location.coordinates.lon,
      modelSlug,
      isDev,
    );
    return res.status(status).json(body);
  }

  // Log raw response for validation
  if (isDev) {
    logRawResponse(config.location, config.model, fetchResult);
  }

  // Build calendar
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

    console.log(
      `[Open-Meteo] Generated calendar with ${sessions.length} sessions for ${config.location}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: "Failed to generate calendar",
      code: "PIPELINE_ERROR",
      ...(isDev && {
        debug: {
          message,
          location: config.location,
          model: config.model,
        },
      }),
    });
  }

  // Set response headers
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
