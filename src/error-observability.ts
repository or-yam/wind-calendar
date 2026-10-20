import * as Sentry from "@sentry/react";
import {
  isMonitoredDeployment,
  scrubErrorBreadcrumb,
  scrubErrorEvent,
} from "@shared/error-observability-privacy";

const dsn = import.meta.env.VITE_SENTRY_DSN;
const deploymentEnvironment = import.meta.env.VITE_SENTRY_DEPLOYMENT_ENVIRONMENT;
const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || deploymentEnvironment;

if (
  dsn &&
  import.meta.env.PROD &&
  import.meta.env.MODE !== "test" &&
  isMonitoredDeployment(deploymentEnvironment)
) {
  Sentry.init({
    dsn,
    environment,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      stackFrameVariables: false,
    },
    beforeSend: scrubErrorEvent,
    beforeBreadcrumb: scrubErrorBreadcrumb,
  });
}

export const reportReactError = Sentry.reactErrorHandler();
