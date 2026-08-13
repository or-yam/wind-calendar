import { randomUUID } from "node:crypto";
import { defineHandler, type H3Event } from "nitro";

type ApiHandler<T> = (event: H3Event) => T | Promise<T>;

function getStatusCode(error: unknown): number {
  if (!error || typeof error !== "object") return 500;

  const statusCode = "statusCode" in error ? error.statusCode : undefined;
  return typeof statusCode === "number" ? statusCode : 500;
}

export function withRuntimeLogging<T>(route: string, handler: ApiHandler<T>) {
  return defineHandler(async (event) => {
    const requestId = randomUUID();
    event.res.headers.set("X-Request-ID", requestId);
    event.res.errHeaders.set("X-Request-ID", requestId);

    try {
      return await handler(event);
    } catch (error) {
      const status = getStatusCode(error);

      // Routine client mistakes are already visible through Vercel's request status metadata.
      if (status >= 500) {
        console.error(
          JSON.stringify({
            level: "error",
            message: "api_request_failed",
            route,
            method: event.req.method,
            requestId,
            errorType: error instanceof Error ? error.constructor.name : "Unknown",
          }),
        );
      }

      throw error;
    }
  });
}
