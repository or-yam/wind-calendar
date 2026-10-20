import { defineHandler, HTTPError } from "nitro";
import { getQuery } from "nitro/h3";
import { Effect } from "effect";

import { generateIcsEvents } from "../utils/generateIcsEvents";
import { checkRateLimit } from "../utils/rate-limit";
import { isDev, getClientIp, parseConfig, toHttpError } from "../utils/api-handler";
import { buildLocationSessions } from "../utils/location-sessions";

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

  const calendarProgram = Effect.gen(function* () {
    const config = yield* parseConfig(getQuery(event));
    const result = yield* buildLocationSessions(config, dev);
    return { config, result };
  }).pipe(Effect.mapError(toHttpError));

  const { config, result } = await Effect.runPromise(calendarProgram);

  const { sessions, dataSources, fallbackUsed } = result;

  let icsString;
  try {
    icsString = generateIcsEvents(sessions);
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
            locations: config.locations,
          },
        }),
      },
    });
  }

  event.res.headers.set("Content-Type", "text/calendar; charset=utf-8");
  event.res.headers.set("X-Data-Source", [...new Set(Object.values(dataSources))].join(","));
  if (fallbackUsed) {
    event.res.headers.set("X-Fallback-Used", "true");
  }
  event.res.headers.set(
    "Cache-Control",
    "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
  );
  event.res.headers.set(
    "Content-Disposition",
    `inline; filename="wind-forecast-${config.locations.join("-")}.ics"`,
  );
  return icsString;
});
