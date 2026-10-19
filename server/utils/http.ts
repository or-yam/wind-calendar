import { Effect } from "effect";
import {
  ProviderBadJson,
  ProviderBadStatus,
  ProviderNetworkError,
  ProviderTimeout,
  type ProviderError,
} from "../errors";

/**
 * Perform a provider request, mapping transport failures to typed errors.
 * Timeouts are detected the same way as before: an `AbortSignal.timeout`
 * abort surfaces as a `DOMException` named `TimeoutError` or `AbortError`.
 */
export function providerFetch(
  url: string,
  options: { headers?: HeadersInit; timeoutMs: number },
): Effect.Effect<Response, ProviderTimeout | ProviderNetworkError> {
  return Effect.tryPromise({
    try: () =>
      fetch(url, { headers: options.headers, signal: AbortSignal.timeout(options.timeoutMs) }),
    catch: (cause) => {
      const isTimeout =
        cause instanceof DOMException &&
        (cause.name === "TimeoutError" || cause.name === "AbortError");

      if (isTimeout) {
        return new ProviderTimeout({
          message: `Request timed out after ${options.timeoutMs}ms`,
          url,
        });
      }

      return new ProviderNetworkError({
        message: `Network error: ${cause instanceof Error ? cause.message : String(cause)}`,
        url,
      });
    },
  });
}

/** Read a response body, falling back to a placeholder when it cannot be read. */
export function providerBodyText(response: Response): Effect.Effect<string> {
  return Effect.tryPromise(() => response.text()).pipe(
    Effect.orElseSucceed(() => "<response body unavailable>"),
  );
}

export function providerJson<T>(
  response: Response,
  url: string,
): Effect.Effect<T, ProviderBadJson> {
  return Effect.tryPromise({
    try: () => response.json() as Promise<T>,
    catch: () =>
      new ProviderBadJson({
        message: `Invalid JSON response (status ${response.status})`,
        url,
        status: response.status,
      }),
  });
}

export function providerBadStatus(
  response: Response,
  body: string,
  url: string,
): ProviderBadStatus {
  return new ProviderBadStatus({
    message: `API request failed: ${response.status} ${response.statusText}`,
    url,
    status: response.status,
    statusText: response.statusText,
    body,
  });
}

/** Fetch a JSON document, failing with a typed `ProviderError`. */
export function requestJson<T>(
  url: string,
  options: { headers?: HeadersInit; timeoutMs: number },
): Effect.Effect<T, ProviderError> {
  return Effect.gen(function* () {
    const response = yield* providerFetch(url, options);

    if (!response.ok) {
      const body = yield* providerBodyText(response);
      return yield* providerBadStatus(response, body, url);
    }

    return yield* providerJson<T>(response, url);
  });
}
