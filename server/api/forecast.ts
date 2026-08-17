import { defineHandler, HTTPError } from "nitro";
import { getQuery } from "nitro/h3";

import type { CalendarConfig } from "../../shared/types.js";
import type {
  HourlyCondition,
  ForecastSession,
  ForecastResponse,
} from "../../shared/forecast-types.js";
import { degreesToCardinal } from "../../shared/wind-directions.js";
import { parseQueryParams } from "../config.js";
import { checkRateLimit } from "../utils/rate-limit.js";
import { isDev, getClientIp } from "../utils/api-handler.js";
import { buildLocationSessions, type LocationSession } from "../utils/location-sessions.js";
import { queryToSearchParams } from "../utils/query-params.js";
import type { WindConditionRaw } from "../types/wind-conditions.js";

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

function serializeSession(session: LocationSession): ForecastSession {
  return {
    location: {
      id: session.location.id,
      label: session.location.label,
    },
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
    event.res.headers.set("Retry-After", rateCheck.retryAfter.toString());
    throw new HTTPError({
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
    const searchParams = queryToSearchParams(getQuery(event));
    config = parseQueryParams(searchParams);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new HTTPError({
      statusCode: 400,
      statusMessage: "Bad Request",
      data: { error: message },
    });
  }

  const result = await buildLocationSessions(config, dev);

  if (result.success === false) {
    throw new HTTPError({
      statusCode: result.status,
      statusMessage: result.body.error,
      data: result.body,
    });
  }

  const { sessions, dataSources, fallbackUsed } = result;
  const dataSource = [...new Set(Object.values(dataSources))].join(",");

  const body: ForecastResponse = {
    meta: {
      location: config.locations[0],
      locations: config.locations,
      model: config.model,
      dataSource,
      dataSources,
      generatedAt: new Date().toISOString(),
    },
    sessions: sessions.map(serializeSession),
  };

  event.res.headers.set("Content-Type", "application/json; charset=utf-8");
  event.res.headers.set("X-Data-Source", dataSource);
  if (fallbackUsed) {
    event.res.headers.set("X-Fallback-Used", "true");
  }
  event.res.headers.set(
    "Cache-Control",
    "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
  );
  return body;
});
