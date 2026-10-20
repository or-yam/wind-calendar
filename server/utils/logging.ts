import { AsyncLocalStorage } from "node:async_hooks";
import { errorDetails } from "./error-details.js";
import { Effect, Logger } from "effect";

export const requestContext = new AsyncLocalStorage<Record<string, string>>();

export function writeLog(
  level: "info" | "warning" | "error",
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    ...fields,
    ...requestContext.getStore(),
    timestamp: new Date().toISOString(),
    level,
    event,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    version: process.env.VERCEL_GIT_COMMIT_SHA,
  });
  if (level === "error") console.error(line);
  else console.info(line);
}

const logger = Logger.make((options) => {
  const entry = Logger.formatStructured.log(options);
  const level =
    options.logLevel === "Error" || options.logLevel === "Fatal"
      ? "error"
      : options.logLevel === "Warn"
        ? "warning"
        : "info";
  writeLog(level, String(entry.message), entry.annotations);
});

export function runLoggedEffect<A, E>(program: Effect.Effect<A, E>): Promise<A> {
  return Effect.runPromise(
    program.pipe(
      Effect.annotateLogs(requestContext.getStore() ?? {}),
      Effect.provide(Logger.layer([logger])),
    ),
  );
}

export function observeProviderRequest<A, E>(
  program: Effect.Effect<A, E>,
  url: string,
): Effect.Effect<A, E> {
  return Effect.suspend(() => {
    const start = performance.now();
    const target = new URL(url);
    const fields = () => ({
      upstreamHost: target.hostname,
      upstreamPath: target.pathname,
      durationMs: Math.round(performance.now() - start),
    });
    return program.pipe(
      Effect.tap(() =>
        Effect.logInfo("provider_request_completed").pipe(Effect.annotateLogs(fields())),
      ),
      Effect.tapError((error) =>
        Effect.logWarning("provider_request_failed").pipe(
          Effect.annotateLogs({ ...fields(), ...errorDetails(error) }),
        ),
      ),
    );
  });
}
