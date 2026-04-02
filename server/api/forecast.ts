import { defineHandler } from "nitro";
import { getQuery, setHeader, createError } from "nitro/h3";

import type { CalendarConfig } from "../../shared/types";
import type {
  HourlyCondition,
  ForecastSession,
  ForecastResponse,
} from "../../shared/forecast-types";
import { parseQueryParams, resolveLocation } from "../config";
import { filterEvents } from "../utils/filterEvents";
import { groupSessions, degreesToCardinal, type Session } from "../utils/groupSessions";
import { checkRateLimit } from "../utils/rate-limit";
import { isDev, getClientIp, resolveForecastData } from "../utils/api-handler";
import type { WindConditionRaw } from "../types/wind-conditions";

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

export default defineHandler(async (event) => {
  const dev = isDev();

  const rateCheck = checkRateLimit(getClientIp(event));
  if (rateCheck.limited) {
    setHeader(event, "Retry-After", rateCheck.retryAfter.toString());
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
      data: {
        error: "Too many requests",
        code: "RATE_LIMITED",
        suggestion: `Try again in ${rateCheck.retryAfter} seconds`,
      },
    });
  }

  let config: CalendarConfig;
  try {
    const query = getQuery(event);
    const searchParams = new URLSearchParams(
      Object.fromEntries(Object.entries(query).filter(([, v]) => typeof v === "string")) as Record<
        string,
        string
      >,
    );
    config = parseQueryParams(searchParams);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      data: { error: message },
    });
  }

  let location: ReturnType<typeof resolveLocation>;
  try {
    location = resolveLocation(config.location);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      data: { error: message },
    });
  }

  const result = await resolveForecastData(config, location, dev);

  if (result.success === false) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.body.error,
      data: result.body,
    });
  }

  const { fetchResult, dataSource, fallbackUsed } = result;

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
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: {
        error: "Failed to process forecast data",
        code: "PIPELINE_ERROR",
        ...(dev && {
          debug: {
            message,
            spotId: location.spotId,
            location: config.location,
          },
        }),
      },
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

  setHeader(event, "Content-Type", "application/json; charset=utf-8");
  setHeader(event, "X-Data-Source", dataSource);
  if (fallbackUsed) {
    setHeader(event, "X-Fallback-Used", "true");
  }
  setHeader(
    event,
    "Cache-Control",
    "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
  );
  return body;
});
