import type { VercelRequest, VercelResponse } from "@vercel/node";

import type { CalendarConfig } from "../shared/types.js";
import { parseQueryParams, resolveLocation } from "../server/config.js";
import { fetchWindData } from "../server/windguru/api.js";
import { fetchOpenMeteoData } from "../server/open-meteo/forecast.js";
import {
  getProvider,
  getWindguruFallback,
  getOpenMeteoSlug,
  isOpenMeteoModelId,
  type Provider,
  type ModelId,
} from "../shared/models.js";
import { tryCatch } from "../server/utils/try-catch.js";
import { filterEvents } from "../server/utils/filterEvents.js";
import { groupSessions, degreesToCardinal, type Session } from "../server/utils/groupSessions.js";
import { checkRateLimit } from "../server/utils/rate-limit.js";
import {
  isDev,
  getClientIp,
  setDevCors,
  classifyFetchError,
  fetchWindguruWithErrorHandling,
} from "../server/utils/api-handler.js";
import type { WindConditionRaw } from "../server/types/wind-conditions.js";

interface HourlyCondition {
  time: string;
  windSpeed: number | null;
  windGusts: number | null;
  windDirection: string | null;
  windDirectionDeg: number | null;
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDirection: string | null;
  swellHeight: number | null;
  swellPeriod: number | null;
}

interface ForecastSession {
  start: string;
  end: string;
  matchType: "wind" | "wave" | "both";
  wind: {
    min: number;
    max: number;
    gustMax: number;
    direction: string;
  };
  wave: {
    avgHeight: number;
    avgPeriod: number;
    direction: string;
  };
  swell: {
    avgHeight: number;
    avgPeriod: number;
  };
  hourly: HourlyCondition[];
}

interface ForecastResponse {
  meta: {
    location: string;
    model: string | number;
    dataSource: string;
    generatedAt: string;
  };
  sessions: ForecastSession[];
}

function serializeCondition(c: WindConditionRaw): HourlyCondition {
  return {
    time: c.date.toISOString(),
    windSpeed: c.windSpeed,
    windGusts: c.windGusts,
    windDirection: c.windDirection != null ? degreesToCardinal(c.windDirection) : null,
    windDirectionDeg: c.windDirection,
    waveHeight: c.waveHeight,
    wavePeriod: c.wavePeriod,
    waveDirection: c.waveDirection != null ? degreesToCardinal(c.waveDirection) : null,
    swellHeight: c.swellHeight,
    swellPeriod: c.swellPeriod,
  };
}

function serializeSession(session: Session): ForecastSession {
  return {
    start: session.start.toISOString(),
    end: session.end.toISOString(),
    matchType: session.matchType,
    wind: {
      min: Math.round(session.windMin),
      max: Math.round(session.windMax),
      gustMax: Math.round(session.gustMax),
      direction: session.dominantDirection,
    },
    wave: {
      avgHeight: parseFloat(session.waveAvg.toFixed(2)),
      avgPeriod: Math.round(session.wavePeriodAvg),
      direction: session.waveDominantDirection,
    },
    swell: {
      avgHeight: parseFloat(session.swellHeightAvg.toFixed(2)),
      avgPeriod: Math.round(session.swellPeriodAvg),
    },
    hourly: session.conditions.map(serializeCondition),
  };
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
  const modelId = config.model as ModelId;
  const provider = getProvider(modelId);

  let fetchResult: Awaited<ReturnType<typeof fetchWindData>>;
  let dataSource: Provider = provider;
  let fallbackUsed = false;

  if (isOpenMeteoModelId(modelId)) {
    if (!location.coordinates) {
      return res.status(400).json({
        error: "Location coordinates unavailable for Open-Meteo",
        code: "MISSING_COORDINATES",
        suggestion: "This location does not support Open-Meteo models",
      });
    }

    const openMeteoSlug = getOpenMeteoSlug(modelId);

    if (dev) {
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
      if (dev) {
        console.error(`[API] Open-Meteo failed: ${omError.message}`);
      }

      const fallbackModelId = getWindguruFallback(modelId);

      if (fallbackModelId) {
        if (dev) {
          console.log(`[API] Falling back to Windguru model ${fallbackModelId}`);
        }

        const locationInfo = `location=${config.location}, spotId=${location.spotId}`;
        const result = await fetchWindguruWithErrorHandling(
          location.spotId,
          fallbackModelId,
          locationInfo,
          dev,
        );

        if (result.success === false) {
          return res.status(result.status).json(result.body);
        }

        fetchResult = result.data;
        dataSource = "windguru";
        fallbackUsed = true;
      } else {
        const { status, body } = classifyFetchError(
          omError,
          "openmeteo",
          `location=${config.location}, model=${config.model}`,
          dev,
        );
        return res.status(status).json(body);
      }
    } else {
      fetchResult = omData;
      dataSource = "openmeteo";
    }
  } else {
    if (dev) {
      console.log(`[API] Fetching Windguru: ${config.location}, model ${modelId}`);
    }

    const locationInfo = `location=${config.location}, spotId=${location.spotId}`;
    const result = await fetchWindguruWithErrorHandling(
      location.spotId,
      modelId,
      locationInfo,
      dev,
    );

    if (result.success === false) {
      return res.status(result.status).json(result.body);
    }

    fetchResult = result.data;
    dataSource = "windguru";
  }

  if (!fetchResult) {
    throw new Error("Internal error: fetchResult is null after provider routing");
  }

  let sessions: Session[];
  try {
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
      tz: location.tz,
    });

    sessions = groupSessions(conditions, matchReasons, config.minSessionHours);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: "Failed to process forecast data",
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

  const body: ForecastResponse = {
    meta: {
      location: config.location,
      model: config.model,
      dataSource,
      generatedAt: new Date().toISOString(),
    },
    sessions: sessions.map(serializeSession),
  };

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Data-Source", dataSource);
  if (fallbackUsed) {
    res.setHeader("X-Fallback-Used", "true");
  }
  res.setHeader(
    "Cache-Control",
    "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
  );
  return res.status(200).json(body);
}
