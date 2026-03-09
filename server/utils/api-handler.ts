import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ApiError } from "../windguru/fetch.js";
import { fetchWindData } from "../windguru/api.js";
import { tryCatch } from "./try-catch.js";
import type { Provider, WindguruModelId } from "../../shared/models.js";

export interface ErrorResponse {
  error: string;
  code?: string;
  suggestion?: string;
  debug?: Record<string, unknown>;
}

export function isDev(): boolean {
  return !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development";
}

export function getClientIp(req: VercelRequest): string {
  return (
    (Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) ??
    req.socket?.remoteAddress ??
    "unknown"
  );
}

export function setDevCors(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export function classifyFetchError(
  error: Error,
  provider: Provider,
  locationInfo: string,
  dev: boolean,
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
