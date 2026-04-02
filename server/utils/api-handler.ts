import type { H3Event } from "nitro";
import { ApiError } from "../windguru/fetch";
import { fetchWindData } from "../windguru/api";
import { fetchOpenMeteoData } from "../open-meteo/forecast";
import { tryCatch } from "./try-catch";
import {
  getProvider,
  getWindguruFallback,
  getOpenMeteoSlug,
  isOpenMeteoModelId,
  type Provider,
  type ModelId,
  type WindguruModelId,
} from "../../shared/models";

export interface ErrorResponse {
  error: string;
  code?: string;
  suggestion?: string;
  debug?: Record<string, unknown>;
}

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

export function classifyFetchError(
  error: Error,
  provider: Provider,
  locationInfo: string,
  dev: boolean,
): { status: number; body: ErrorResponse } {
  const providerName = provider === "windguru" ? "Windguru" : "Open-Meteo";
  const debug: Record<string, unknown> = { provider, locationInfo };

  if (provider === "openmeteo" && !(error instanceof ApiError)) {
    // Plain errors from Open-Meteo data parsing (Missing/Invalid fields after a successful fetch)
    if (error.message.includes("Missing") || error.message.includes("Invalid")) {
      return {
        status: 502,
        body: {
          error: "Invalid response from Open-Meteo",
          code: "OPENMETEO_BAD_RESPONSE",
          suggestion: "The API response format may have changed",
          ...(dev && { debug: { ...debug, message: error.message } }),
        },
      };
    }
  }

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
          ...(dev && { debug }),
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
          ...(dev && { debug }),
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
          ...(dev && { debug }),
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
          ...(dev && { debug }),
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
          ...(dev && { debug }),
        },
      };
    }

    if (error.status && error.status < 400) {
      return {
        status: 502,
        body: {
          error: `Invalid response from ${providerName}`,
          code: `${provider.toUpperCase()}_BAD_RESPONSE`,
          suggestion: `${providerName} may have changed their API format`,
          ...(dev && { debug }),
        },
      };
    }

    if (!error.status) {
      return {
        status: 504,
        body: {
          error: `Could not reach ${providerName}`,
          code: `${provider.toUpperCase()}_UNREACHABLE`,
          suggestion: `Could not reach ${providerName}. Try again in a few minutes`,
          ...(dev && { debug }),
        },
      };
    }
  }

  return {
    status: 502,
    body: {
      error: `${providerName} request failed`,
      code: "FETCH_FAILED",
      ...(dev && { debug }),
    },
  };
}

export async function fetchWindguruWithErrorHandling(
  spotId: string,
  modelId: WindguruModelId,
  locationInfo: string,
  dev: boolean,
): Promise<
  | { success: true; data: Awaited<ReturnType<typeof fetchWindData>> }
  | { success: false; status: number; body: ErrorResponse }
> {
  const { data, error } = await tryCatch(fetchWindData(spotId, modelId));

  if (error) {
    const { status, body } = classifyFetchError(error, "windguru", locationInfo, dev);
    return { success: false, status, body };
  }

  return { success: true, data };
}

export type ForecastResult =
  | {
      success: true;
      fetchResult: Awaited<ReturnType<typeof fetchWindData>>;
      dataSource: Provider;
      fallbackUsed: boolean;
    }
  | { success: false; status: number; body: ErrorResponse };

export async function resolveForecastData(
  config: { location: string; model: ModelId | string | number },
  location: { spotId: string; tz: string; coordinates?: { lat: number; lon: number } },
  dev: boolean,
): Promise<ForecastResult> {
  const modelId = config.model as ModelId;
  const provider = getProvider(modelId);

  if (isOpenMeteoModelId(modelId)) {
    if (!location.coordinates) {
      return {
        success: false,
        status: 400,
        body: {
          error: "Location coordinates unavailable for Open-Meteo",
          code: "MISSING_COORDINATES",
          suggestion: "This location does not support Open-Meteo models",
        },
      };
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
          return result;
        }

        return {
          success: true,
          fetchResult: result.data,
          dataSource: "windguru",
          fallbackUsed: true,
        };
      }

      const { status, body } = classifyFetchError(
        omError,
        "openmeteo",
        `location=${config.location}, model=${config.model}`,
        dev,
      );
      return { success: false, status, body };
    }

    return { success: true, fetchResult: omData, dataSource: "openmeteo", fallbackUsed: false };
  }

  // Windguru path
  if (dev) {
    console.log(`[API] Fetching Windguru: ${config.location}, model ${modelId}`);
  }

  const locationInfo = `location=${config.location}, spotId=${location.spotId}`;
  const result = await fetchWindguruWithErrorHandling(
    location.spotId,
    modelId as WindguruModelId,
    locationInfo,
    dev,
  );

  if (result.success === false) {
    return result;
  }

  return { success: true, fetchResult: result.data, dataSource: provider, fallbackUsed: false };
}
