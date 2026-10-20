import { randomUUID } from "node:crypto";
import { ForecastError } from "../errors.js";
import { HTTPError, type H3Event } from "nitro";
import { errorDetails, httpErrorCause } from "./error-details.js";
import { requestContext, writeLog } from "./logging.js";

export function observedHandler<A>(
  endpoint: string,
  handler: (event: H3Event) => Promise<A>,
): (event: H3Event) => Promise<A> {
  return (event) => {
    const requestId = randomUUID();
    event.res.headers.set("X-Request-Id", requestId);
    return requestContext.run({ requestId, endpoint, method: event.req.method }, async () => {
      const start = performance.now();
      try {
        const result = await handler(event);
        writeLog("info", "request_completed", {
          status: event.res.status ?? 200,
          durationMs: Math.round(performance.now() - start),
        });
        return result;
      } catch (error) {
        const status = HTTPError.isError(error) ? error.status : 500;
        writeLog(
          status >= 500 ||
            (HTTPError.isError(error) && httpErrorCause(error) instanceof ForecastError)
            ? "error"
            : status === 404 || status === 405
              ? "info"
              : "warning",
          "request_failed",
          {
            status,
            durationMs: Math.round(performance.now() - start),
            ...errorDetails(error),
          },
        );
        const responseError = HTTPError.isError(error)
          ? error
          : new HTTPError({
              statusCode: 500,
              statusMessage: "Internal Server Error",
              message: "Internal Server Error",
              cause: error,
              unhandled: false,
            });
        const headers = new Headers(responseError.headers);
        headers.set("X-Request-Id", requestId);
        const retryAfter = event.res.headers.get("Retry-After");
        if (retryAfter) headers.set("Retry-After", retryAfter);
        const withHeaders = new HTTPError(responseError.message, {
          status: responseError.status,
          statusText: responseError.statusText,
          data: responseError.data,
          body: responseError.body,
          unhandled: responseError.unhandled,
          cause: httpErrorCause(responseError),
          headers,
        });
        withHeaders.stack = error instanceof Error ? error.stack : responseError.stack;
        throw withHeaders;
      }
    });
  };
}
