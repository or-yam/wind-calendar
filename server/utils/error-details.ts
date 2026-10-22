import { HTTPError } from "nitro";
import {
  ConfigError,
  ExternalError,
  ForecastError,
  ProviderBadJson,
  ProviderBadStatus,
  ProviderDataError,
  ProviderNetworkError,
  ProviderTimeout,
} from "../errors.js";

export function httpErrorCause(error: HTTPError): unknown {
  const input = error.cause;
  if (input instanceof Error) return input;
  return input && typeof input === "object" && Object.hasOwn(input, "cause")
    ? (input as { cause?: unknown }).cause
    : undefined;
}

export function errorDetails(error: unknown, depth = 0): Record<string, unknown> {
  if (!(error instanceof Error) || depth > 4) return {};
  const details: Record<string, unknown> = { errorType: error.name };
  if (error instanceof ConfigError || error instanceof ExternalError) details.errorTag = error._tag;
  if (error instanceof ForecastError) {
    details.errorTag = error._tag;
    details.code = error.body.code;
  }
  if (error instanceof ProviderDataError) details.errorTag = error._tag;
  if (
    error instanceof ProviderTimeout ||
    error instanceof ProviderNetworkError ||
    error instanceof ProviderBadJson ||
    error instanceof ProviderBadStatus
  ) {
    details.errorTag = error._tag;
    try {
      const url = new URL(error.url);
      details.upstreamHost = url.hostname;
      details.upstreamPath = url.pathname;
    } catch {
      /* Malformed URLs must not break error reporting. */
    }
    if ("status" in error) details.upstreamStatus = error.status;
  }
  if (!details.errorTag && !HTTPError.isError(error)) {
    const frames = error.stack
      ?.split("\n")
      .slice(1)
      .flatMap((line) => line.match(/(?:\/[\w.@+-]+)+\.(?:[cm]?js|tsx?):\d+:\d+/g) ?? []);
    if (frames?.length) details.frames = frames.slice(0, 8);
  }
  const cause = HTTPError.isError(error) ? httpErrorCause(error) : error.cause;
  if (cause) {
    const nested = errorDetails(cause, depth + 1);
    if (Object.keys(nested).length) details.cause = nested;
  }
  return details;
}
