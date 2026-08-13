import * as Sentry from "@sentry/react";
import {
  isMonitoredDeployment,
  scrubSentryBreadcrumb,
  scrubSentryEvent,
} from "@shared/sentry-privacy";

export function createBrowserSentryOptions(dsn: string, environment: string, release?: string) {
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
    beforeBreadcrumb: scrubSentryBreadcrumb,
  } satisfies Parameters<typeof Sentry.init>[0];
}

const dsn = import.meta.env.VITE_SENTRY_DSN;
const deploymentEnvironment = import.meta.env.VITE_SENTRY_DEPLOYMENT_ENVIRONMENT;
const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || deploymentEnvironment;

if (
  dsn &&
  import.meta.env.PROD &&
  import.meta.env.MODE !== "test" &&
  isMonitoredDeployment(deploymentEnvironment)
) {
  Sentry.init(createBrowserSentryOptions(dsn, environment, import.meta.env.VITE_SENTRY_RELEASE));
}
