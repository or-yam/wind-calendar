import { defineHandler, HTTPError } from "nitro";
import { getQuery } from "nitro/h3";

import type { CalendarConfig } from "../../shared/types";
import { parseQueryParams, resolveLocation } from "../config";
import { fetchWindData } from "../windguru/api";
import { filterEvents } from "../utils/filterEvents";
import { groupSessions } from "../utils/groupSessions";
import { generateIcsEvents } from "../utils/generateIcsEvents";
import { checkRateLimit } from "../utils/rate-limit";
import { isDev, getClientIp, resolveForecastData } from "../utils/api-handler";

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
    throw new HTTPError({
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
    throw new HTTPError({
      statusCode: 400,
      statusMessage: "Bad Request",
      data: { error: message },
    });
  }

  const result = await resolveForecastData(config, location, dev);

  if (result.success === false) {
    throw new HTTPError({
      statusCode: result.status,
      statusMessage: result.body.error,
      data: result.body,
    });
  }

  const { fetchResult, dataSource, fallbackUsed } = result;

  let icsString;
  try {
    icsString = buildCalendar(fetchResult, config, location.tz);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new HTTPError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: {
        error: "Failed to generate calendar",
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

  event.res.headers.set("Content-Type", "text/calendar; charset=utf-8");
  event.res.headers.set("X-Data-Source", dataSource);
  if (fallbackUsed) {
    event.res.headers.set("X-Fallback-Used", "true");
  }
  event.res.headers.set(
    "Cache-Control",
    "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
  );
  event.res.headers.set(
    "Content-Disposition",
    `inline; filename="wind-forecast-${config.location}.ics"`,
  );
  return icsString;
});
