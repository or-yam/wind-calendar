import * as Sentry from "@sentry/react";
import type { RootOptions } from "react-dom/client";
import { getErrorReportingOrigin } from "@shared/error-observability-config";
import {
  isMonitoredDeployment,
  scrubErrorBreadcrumb,
  scrubErrorEvent,
} from "@shared/error-observability-privacy";

const dsn = import.meta.env.VITE_SENTRY_DSN;
const deploymentEnvironment = import.meta.env.VITE_SENTRY_DEPLOYMENT_ENVIRONMENT;
const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || deploymentEnvironment;

const monitoringEnabled = Boolean(
  getErrorReportingOrigin(dsn) &&
  import.meta.env.PROD &&
  import.meta.env.MODE !== "test" &&
  isMonitoredDeployment(deploymentEnvironment),
);

if (monitoringEnabled) {
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

const reportUnhandledError = Sentry.reactErrorHandler();
const logReactError = (error: unknown) => console.error(error);

export const reactErrorHandlers: RootOptions | undefined = monitoringEnabled
  ? {
      onUncaughtError: (error, errorInfo) => {
        logReactError(error);
        reportUnhandledError(error, errorInfo);
      },
      onCaughtError: Sentry.reactErrorHandler(logReactError),
      onRecoverableError: Sentry.reactErrorHandler(logReactError),
    }
  : undefined;
