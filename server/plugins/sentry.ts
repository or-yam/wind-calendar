import * as Sentry from "@sentry/nitro";
import { definePlugin } from "nitro";
import { isMonitoredDeployment, scrubSentryEvent } from "../../shared/sentry-privacy.js";

export function createServerSentryOptions(dsn: string, environment: string, release?: string) {
  return {
    dsn,
    environment,
    release: release || undefined,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      stackFrameVariables: false,
    },
    beforeSend: scrubSentryEvent,
  } satisfies Parameters<typeof Sentry.init>[0];
}

export default definePlugin(() => {
  const dsn = process.env.SENTRY_DSN;
  const deploymentEnvironment = process.env.VERCEL_ENV;
  const environment = process.env.SENTRY_ENVIRONMENT || deploymentEnvironment;

  if (
    !dsn ||
    !environment ||
    process.env.NODE_ENV === "test" ||
    !isMonitoredDeployment(deploymentEnvironment)
  )
    return;

  Sentry.init(
    createServerSentryOptions(
      dsn,
      environment,
      process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    ),
  );
});
