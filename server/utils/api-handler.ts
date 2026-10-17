import type { H3Event } from "nitro";
import { HTTPError } from "nitro";
import { Effect, Match } from "effect";
import { classifyProviderError, ConfigError, ForecastError } from "../errors";
import { fetchWindData } from "../windguru/api";
import { fetchOpenMeteoData } from "../open-meteo/forecast";
import { parseQueryParams } from "../config";
import { queryToSearchParams } from "./query-params";
import type { CalendarConfig } from "../../shared/types";
import type { ProviderWindData } from "../types/wind-conditions";
import {
  getProvider,
  getWindguruFallback,
  getOpenMeteoSlug,
  isOpenMeteoModelId,
  type Provider,
  type ModelId,
  type WindguruModelId,
} from "../../shared/models";

export function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function getClientIp(event: H3Event): string {
  const xForwardedFor = event.req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  const remoteAddress = event.node?.req?.socket?.remoteAddress;
  return remoteAddress ?? "unknown";
}

/** Parse URL query parameters into a config, as a typed effect. */
export function parseConfig(
  query: Record<string, unknown>,
): Effect.Effect<CalendarConfig, ConfigError> {
  return Effect.try({
    try: () => parseQueryParams(queryToSearchParams(query)),
    catch: (cause) =>
      new ConfigError({ message: cause instanceof Error ? cause.message : String(cause) }),
  });
}

export interface ResolvedForecast {
  fetchResult: ProviderWindData;
  dataSource: Provider;
  fallbackUsed: boolean;
}

export function fetchWindguruWithErrorHandling(
  spotId: string,
  modelId: WindguruModelId,
  locationInfo: string,
  dev: boolean,
): Effect.Effect<ProviderWindData, ForecastError> {
  return fetchWindData(spotId, modelId).pipe(
    Effect.mapError((error) => classifyProviderError(error, "windguru", locationInfo, dev)),
  );
}

export function resolveForecastData(
  config: { location: string; model: ModelId | string | number },
  location: { spotId: string; tz: string; coordinates?: { lat: number; lon: number } },
  dev: boolean,
): Effect.Effect<ResolvedForecast, ForecastError> {
  const modelId = config.model as ModelId;
  const provider = getProvider(modelId);

  if (isOpenMeteoModelId(modelId)) {
    const coordinates = location.coordinates;

    if (!coordinates) {
      return Effect.fail(
        new ForecastError({
          status: 400,
          body: {
            error: "Location coordinates unavailable for Open-Meteo",
            code: "MISSING_COORDINATES",
            suggestion: "This location does not support Open-Meteo models",
          },
        }),
      );
    }

    const openMeteoSlug = getOpenMeteoSlug(modelId);
    const locationInfo = `location=${config.location}, model=${config.model}`;

    const openMeteo = Effect.gen(function* () {
      if (dev) {
        yield* Effect.log(`[API] Fetching Open-Meteo: ${config.location}, model ${openMeteoSlug}`);
      }

      const fetchResult = yield* fetchOpenMeteoData(
        coordinates.lat,
        coordinates.lon,
        openMeteoSlug,
        location.tz,
      );

      return { fetchResult, dataSource: "openmeteo" as const, fallbackUsed: false };
    });

    return openMeteo.pipe(
      Effect.catch((error) =>
        Effect.gen(function* () {
          if (dev) {
            yield* Effect.logError(`[API] Open-Meteo failed: ${error.message}`);
          }

          const fallbackModelId = getWindguruFallback(modelId);

          if (fallbackModelId === null) {
            return yield* classifyProviderError(error, "openmeteo", locationInfo, dev);
          }

          if (dev) {
            yield* Effect.log(`[API] Falling back to Windguru model ${fallbackModelId}`);
          }

          const fetchResult = yield* fetchWindguruWithErrorHandling(
            location.spotId,
            fallbackModelId,
            `location=${config.location}, spotId=${location.spotId}`,
            dev,
          );

          return { fetchResult, dataSource: "windguru" as const, fallbackUsed: true };
        }),
      ),
    );
  }

  // Windguru path
  return Effect.gen(function* () {
    if (dev) {
      yield* Effect.log(`[API] Fetching Windguru: ${config.location}, model ${modelId}`);
    }

    const fetchResult = yield* fetchWindguruWithErrorHandling(
      location.spotId,
      modelId as WindguruModelId,
      `location=${config.location}, spotId=${location.spotId}`,
      dev,
    );

    return { fetchResult, dataSource: provider, fallbackUsed: false };
  });
}

/** Map a pipeline failure onto the HTTP error returned to the client. */
export function toHttpError(error: ConfigError | ForecastError): HTTPError {
  return Match.value(error).pipe(
    Match.tag(
      "ConfigError",
      (e) =>
        new HTTPError({
          statusCode: 400,
          statusMessage: "Bad Request",
          data: { error: e.message },
        }),
    ),
    Match.tag(
      "ForecastError",
      (e) => new HTTPError({ statusCode: e.status, statusMessage: e.body.error, data: e.body }),
    ),
    Match.exhaustive,
  );
}
