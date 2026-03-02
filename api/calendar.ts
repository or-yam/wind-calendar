import type { VercelRequest, VercelResponse } from "@vercel/node";

import type { CalendarConfig } from "../shared/types.js";
import { parseQueryParams, resolveLocation } from "../server/config.js";
import { ApiError } from "../server/scraper/fetch.js";
import { fetchWindData } from "../server/scraper/api-scraper.js";
import { tryCatch } from "../server/utils/try-catch.js";
import { filterEvents } from "../server/utils/filterEvents.js";
import { groupSessions } from "../server/utils/groupSessions.js";
import { generateIcsEvents } from "../server/utils/generateIcsEvents.js";

interface ErrorResponse {
  error: string;
  code?: string;
  suggestion?: string;
  debug?: Record<string, unknown>;
}

function classifyFetchError(error: Error, spotId: string): { status: number; body: ErrorResponse } {
  const debug: Record<string, unknown> = { spotId };

  if (error instanceof ApiError) {
    debug.url = error.url;
    debug.upstreamStatus = error.status;

    if (error.status === 429) {
      return {
        status: 429,
        body: {
          error: "Windguru rate limit exceeded",
          code: "WINDGURU_RATE_LIMIT",
          suggestion: "Try again in 5 minutes",
          debug,
        },
      };
    }

    if (error.status === 400) {
      return {
        status: 502,
        body: {
          error: "Invalid request to Windguru",
          code: "WINDGURU_BAD_REQUEST",
          suggestion: "Check that the spot ID is valid",
          debug,
        },
      };
    }

    if (error.status === 403) {
      return {
        status: 502,
        body: {
          error: "Windguru denied access",
          code: "WINDGURU_FORBIDDEN",
          suggestion: "The spot may be restricted or Windguru may be blocking requests",
          debug,
        },
      };
    }

    if (error.status === 404) {
      return {
        status: 502,
        body: {
          error: "Spot not found on Windguru",
          code: "WINDGURU_NOT_FOUND",
          suggestion: "The spot ID may have changed or been removed",
          debug,
        },
      };
    }

    if (error.status && error.status >= 500) {
      return {
        status: 502,
        body: {
          error: "Windguru is temporarily unavailable",
          code: "WINDGURU_DOWN",
          suggestion: "Try again later",
          debug,
        },
      };
    }

    // ApiError with status 200 = JSON parse failure or similar
    if (error.status && error.status < 400) {
      return {
        status: 502,
        body: {
          error: "Invalid response from Windguru",
          code: "WINDGURU_BAD_RESPONSE",
          suggestion: "Windguru may have changed their API format",
          debug,
        },
      };
    }

    // Network/timeout errors (no status code)
    if (!error.status) {
      return {
        status: 504,
        body: {
          error: error.message,
          code: "WINDGURU_UNREACHABLE",
          suggestion: "Could not reach Windguru. Try again in a few minutes",
          debug,
        },
      };
    }
  }

  // Generic / unexpected errors
  return {
    status: 502,
    body: {
      error: error.message,
      code: "FETCH_FAILED",
      debug,
    },
  };
}

function buildCalendar(
  fetchResult: Awaited<ReturnType<typeof fetchWindData>>,
  config: CalendarConfig,
  tz: string,
): string {
  const filtered = filterEvents(fetchResult.windData, {
    windMin: config.windMin,
    windMax: config.windMax,
    sunrise: fetchResult.sunrise,
    sunset: fetchResult.sunset,
    tz,
    waveHeightMin: config.waveHeightMin,
  });

  const sessions = groupSessions(filtered, config.minSessionHours);
  return generateIcsEvents(sessions, tz, config.waveHeightMin);
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

  let config;
  try {
    config = parseQueryParams(url.searchParams);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: message });
  }

  const location = resolveLocation(config.location);

  const { data: fetchResult, error: fetchError } = await tryCatch(
    fetchWindData(location.spotId, config.model),
  );

  if (fetchError) {
    const { status, body } = classifyFetchError(fetchError, location.spotId);
    return res.status(status).json(body);
  }

  let icsString;
  try {
    icsString = buildCalendar(fetchResult, config, location.tz);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: "Failed to generate calendar",
      code: "PIPELINE_ERROR",
      debug: {
        message,
        spotId: location.spotId,
        location: config.location,
      },
    });
  }

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
  );
  res.setHeader("Content-Disposition", `inline; filename="wind-forecast-${config.location}.ics"`);
  return res.status(200).send(icsString);
}
