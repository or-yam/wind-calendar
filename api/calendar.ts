import type { VercelRequest, VercelResponse } from "@vercel/node";

import type { CalendarConfig } from "../shared/types.js";
import { parseQueryParams, resolveLocation } from "../server/config.js";
import { ApiError } from "../server/windguru/fetch.js";
import { fetchWindData } from "../server/windguru/api.js";
import { fetchOpenMeteoData } from "../server/open-meteo/forecast.js";
import {
  getProvider,
  getWindguruFallback,
  getOpenMeteoSlug,
  isOpenMeteoModelId,
  type Provider,
  type WindguruModelId,
  type ModelId,
} from "../shared/models.js";
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

function classifyFetchError(
  error: Error,
  provider: Provider,
  locationInfo: string,
  isDev: boolean,
): { status: number; body: ErrorResponse } {
  const providerName = provider === "windguru" ? "Windguru" : "Open-Meteo";
  const debug: Record<string, unknown> = { provider, locationInfo };

  if (error instanceof ApiError) {
    debug.url = error.url;
    debug.upstreamStatus = error.status;

    if (error.status === 429) {
      return {
        status: 429,
        body: {
          error: `${providerName} rate limit exceeded`,
          code: `${provider.toUpperCase()}_RATE_LIMIT`,
          suggestion: "Try again in 5 minutes",
          ...(isDev && { debug }),
        },
      };
    }

    if (error.status === 400) {
      return {
        status: 502,
        body: {
          error: `Invalid request to ${providerName}`,
          code: `${provider.toUpperCase()}_BAD_REQUEST`,
          suggestion:
            provider === "windguru"
              ? "Check that the spot ID is valid"
              : "Check that coordinates and model are valid",
          ...(isDev && { debug }),
        },
      };
    }

    if (error.status === 403) {
      return {
        status: 502,
        body: {
          error: `${providerName} denied access`,
          code: `${provider.toUpperCase()}_FORBIDDEN`,
          suggestion:
            provider === "windguru"
              ? "The spot may be restricted or Windguru may be blocking requests"
              : "Open-Meteo may be blocking requests",
          ...(isDev && { debug }),
        },
      };
    }

    if (error.status === 404) {
      return {
        status: 502,
        body: {
          error: `Data not found on ${providerName}`,
          code: `${provider.toUpperCase()}_NOT_FOUND`,
          suggestion:
            provider === "windguru"
              ? "The spot ID may have changed or been removed"
              : "The location may not be covered by Open-Meteo",
          ...(isDev && { debug }),
        },
      };
    }

    if (error.status && error.status >= 500) {
      return {
        status: 502,
        body: {
          error: `${providerName} is temporarily unavailable`,
          code: `${provider.toUpperCase()}_DOWN`,
          suggestion: "Try again later",
          ...(isDev && { debug }),
        },
      };
    }

    // ApiError with status 200 = JSON parse failure or similar
    if (error.status && error.status < 400) {
      return {
        status: 502,
        body: {
          error: `Invalid response from ${providerName}`,
          code: `${provider.toUpperCase()}_BAD_RESPONSE`,
          suggestion: `${providerName} may have changed their API format`,
          ...(isDev && { debug }),
        },
      };
    }

    // Network/timeout errors (no status code)
    if (!error.status) {
      return {
        status: 504,
        body: {
          error: `Could not reach ${providerName}`,
          code: `${provider.toUpperCase()}_UNREACHABLE`,
          suggestion: `Could not reach ${providerName}. Try again in a few minutes`,
          ...(isDev && { debug }),
        },
      };
    }
  }

  // Generic / unexpected errors
  return {
    status: 502,
    body: {
      error: `${providerName} request failed`,
      code: "FETCH_FAILED",
      ...(isDev && { debug }),
    },
  };
}

/**
 * Fetch wind data from Windguru with error handling.
 * Extracted to avoid duplication between main path and fallback path.
 */
async function fetchWindguruWithErrorHandling(
  spotId: string,
  modelId: WindguruModelId,
  locationInfo: string,
  isDev: boolean,
): Promise<
  | { success: true; data: Awaited<ReturnType<typeof fetchWindData>> }
  | { success: false; status: number; body: ErrorResponse }
> {
  const { data, error } = await tryCatch(fetchWindData(spotId, modelId));

  if (error) {
    const { status, body } = classifyFetchError(error, "windguru", locationInfo, isDev);
    return { success: false, status, body };
  }

  return { success: true, data };
}

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

  let config: CalendarConfig;
  try {
    config = parseQueryParams(url.searchParams);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: message });
  }

  const location = resolveLocation(config.location);

  // Type assertion safe because parseQueryParams validates with isValidModelId
  const modelId = config.model as ModelId;
  const provider = getProvider(modelId);

  let fetchResult: Awaited<ReturnType<typeof fetchWindData>>;
  let dataSource: Provider = provider;
  let fallbackUsed = false;

  if (isOpenMeteoModelId(modelId)) {
    // Open-Meteo path with Windguru fallback
    if (!location.coordinates) {
      return res.status(400).json({
        error: "Location coordinates unavailable for Open-Meteo",
        code: "MISSING_COORDINATES",
        suggestion: "This location does not support Open-Meteo models",
      });
    }

    const openMeteoSlug = getOpenMeteoSlug(modelId);

    if (isDev) {
      console.log(`[API] Fetching Open-Meteo: ${config.location}, model ${openMeteoSlug}`);
    }

    const { data: omData, error: omError } = await tryCatch(
      fetchOpenMeteoData(
        location.coordinates.lat,
        location.coordinates.lon,
        openMeteoSlug,
        location.tz,
      ),
    );

    if (omError) {
      // Fallback to Windguru
      if (isDev) {
        console.error(`[API] Open-Meteo failed: ${omError.message}`);
      }

      const fallbackModelId = getWindguruFallback(modelId);

      if (fallbackModelId) {
        if (isDev) {
          console.log(`[API] Falling back to Windguru model ${fallbackModelId}`);
        }

        const locationInfo = `location=${config.location}, spotId=${location.spotId}`;
        const result = await fetchWindguruWithErrorHandling(
          location.spotId,
          fallbackModelId,
          locationInfo,
          isDev,
        );

        if (!result.success) {
          return res.status(result.status).json(result.body);
        }

        fetchResult = result.data;
        dataSource = "windguru";
        fallbackUsed = true;
      } else {
        // No fallback available (shouldn't happen, but handle it)
        const { status, body } = classifyFetchError(
          omError,
          "openmeteo",
          `location=${config.location}, model=${config.model}`,
          isDev,
        );
        return res.status(status).json(body);
      }
    } else {
      fetchResult = omData;
      dataSource = "openmeteo";
    }
  } else {
    // Windguru path (no fallback to Open-Meteo)
    if (isDev) {
      console.log(`[API] Fetching Windguru: ${config.location}, model ${modelId}`);
    }

    const locationInfo = `location=${config.location}, spotId=${location.spotId}`;
    const result = await fetchWindguruWithErrorHandling(
      location.spotId,
      modelId,
      locationInfo,
      isDev,
    );

    if (!result.success) {
      return res.status(result.status).json(result.body);
    }

    fetchResult = result.data;
    dataSource = "windguru";
  }

  // Assert non-null (TypeScript can't prove this through complex control flow)
  if (!fetchResult) {
    throw new Error("Internal error: fetchResult is null after provider routing");
  }

  let icsString;
  try {
    icsString = buildCalendar(fetchResult, config, location.tz);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: "Failed to generate calendar",
      code: "PIPELINE_ERROR",
      ...(isDev && {
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
