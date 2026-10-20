import { Data, Match } from "effect";
import type { Provider } from "../shared/models";

export interface ErrorResponse {
  error: string;
  code?: string;
  suggestion?: string;
  debug?: Record<string, unknown>;
}

/** A provider request exceeded its timeout. */
export class ProviderTimeout extends Data.TaggedError("ProviderTimeout")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly url: string;
}> {}

/** A provider request failed before a response was received. */
export class ProviderNetworkError extends Data.TaggedError("ProviderNetworkError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly url: string;
}> {}

/** A provider responded with a non-2xx status. */
export class ProviderBadStatus extends Data.TaggedError("ProviderBadStatus")<{
  readonly message: string;
  readonly url: string;
  readonly status: number;
  readonly statusText: string;
  readonly body: string;
}> {}

/** A provider response body was not valid JSON. */
export class ProviderBadJson extends Data.TaggedError("ProviderBadJson")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly url: string;
  readonly status: number;
}> {}

/** A provider responded, but its payload was missing or malformed. */
export class ProviderDataError extends Data.TaggedError("ProviderDataError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

export type ProviderError =
  | ProviderTimeout
  | ProviderNetworkError
  | ProviderBadStatus
  | ProviderBadJson
  | ProviderDataError;

/** A forecast failure already resolved to an HTTP status and response body. */
export class ForecastError extends Data.TaggedError("ForecastError")<{
  readonly cause?: ProviderError;
  readonly status: number;
  readonly body: ErrorResponse;
}> {}

/** A query string failed validation. */
export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

/** An external (non-provider) call failed, e.g. feature flags or the AI provider. */
export class ExternalError extends Data.TaggedError("ExternalError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

function classifyStatus(
  status: number,
  provider: Provider,
  providerName: string,
  upper: string,
): { status: number; body: Omit<ErrorResponse, "debug"> } | null {
  if (status === 429) {
    return {
      status: 429,
      body: {
        error: `${providerName} rate limit exceeded`,
        code: `${upper}_RATE_LIMIT`,
        suggestion: "Try again in 5 minutes",
      },
    };
  }

  if (status === 400) {
    return {
      status: 502,
      body: {
        error: `Invalid request to ${providerName}`,
        code: `${upper}_BAD_REQUEST`,
        suggestion:
          provider === "windguru"
            ? "Check that the spot ID is valid"
            : "Check that coordinates and model are valid",
      },
    };
  }

  if (status === 403) {
    return {
      status: 502,
      body: {
        error: `${providerName} denied access`,
        code: `${upper}_FORBIDDEN`,
        suggestion:
          provider === "windguru"
            ? "The spot may be restricted or Windguru may be blocking requests"
            : "Open-Meteo may be blocking requests",
      },
    };
  }

  if (status === 404) {
    return {
      status: 502,
      body: {
        error: `Data not found on ${providerName}`,
        code: `${upper}_NOT_FOUND`,
        suggestion:
          provider === "windguru"
            ? "The spot ID may have changed or been removed"
            : "The location may not be covered by Open-Meteo",
      },
    };
  }

  if (status >= 500) {
    return {
      status: 502,
      body: {
        error: `${providerName} is temporarily unavailable`,
        code: `${upper}_DOWN`,
        suggestion: "Try again later",
      },
    };
  }

  if (status < 400) {
    return {
      status: 502,
      body: {
        error: `Invalid response from ${providerName}`,
        code: `${upper}_BAD_RESPONSE`,
        suggestion: `${providerName} may have changed their API format`,
      },
    };
  }

  return null;
}

/**
 * Map a provider failure to the HTTP status and body the API returns for it.
 * Ports the previous `classifyFetchError`, keyed on typed errors instead of
 * string-matching `error.message`.
 */
export function classifyProviderError(
  error: ProviderError,
  provider: Provider,
  locationInfo: string,
  dev: boolean,
): ForecastError {
  const providerName = provider === "windguru" ? "Windguru" : "Open-Meteo";
  const upper = provider.toUpperCase();
  const baseDebug = { provider, locationInfo };

  const fail = (
    status: number,
    body: Omit<ErrorResponse, "debug">,
    debug: Record<string, unknown> = {},
  ): ForecastError =>
    new ForecastError({
      cause: error,
      status,
      body: { ...body, ...(dev && { debug: { ...baseDebug, ...debug } }) },
    });

  const unreachable = (url: string): ForecastError =>
    fail(
      504,
      {
        error: `Could not reach ${providerName}`,
        code: `${upper}_UNREACHABLE`,
        suggestion: `Could not reach ${providerName}. Try again in a few minutes`,
      },
      { url },
    );

  return Match.value(error).pipe(
    Match.tag("ProviderDataError", (e) =>
      provider === "openmeteo"
        ? fail(
            502,
            {
              error: "Invalid response from Open-Meteo",
              code: "OPENMETEO_BAD_RESPONSE",
              suggestion: "The API response format may have changed",
            },
            { message: e.message },
          )
        : fail(502, { error: `${providerName} request failed`, code: "FETCH_FAILED" }),
    ),
    Match.tag("ProviderTimeout", (e) => unreachable(e.url)),
    Match.tag("ProviderNetworkError", (e) => unreachable(e.url)),
    Match.tag("ProviderBadJson", (e) =>
      fail(
        502,
        {
          error: `Invalid response from ${providerName}`,
          code: `${upper}_BAD_RESPONSE`,
          suggestion: `${providerName} may have changed their API format`,
        },
        { url: e.url, upstreamStatus: e.status },
      ),
    ),
    Match.tag("ProviderBadStatus", (e) => {
      const debug = { url: e.url, upstreamStatus: e.status };
      const classified = classifyStatus(e.status, provider, providerName, upper);
      return classified
        ? fail(classified.status, classified.body, debug)
        : fail(502, { error: `${providerName} request failed`, code: "FETCH_FAILED" }, debug);
    }),
    Match.exhaustive,
  );
}
