interface ErrorEventLike {
  request?: {
    url?: string;
    query_string?: unknown;
    headers?: unknown;
    cookies?: unknown;
    data?: unknown;
  };
  user?: unknown;
}

interface ErrorBreadcrumbLike {
  data?: Record<string, unknown>;
}

const PRIVATE_URL_FIELDS = ["url", "from", "to"] as const;

function stripUrlDetails(value: unknown): string {
  return String(value).split(/[?#]/, 1)[0];
}

export function scrubErrorEvent<T extends ErrorEventLike>(event: T): T {
  if (event.request) {
    if (event.request.url) event.request.url = stripUrlDetails(event.request.url);
    delete event.request.query_string;
    delete event.request.headers;
    delete event.request.cookies;
    delete event.request.data;
  }
  delete event.user;
  return event;
}

export function scrubErrorBreadcrumb<T extends ErrorBreadcrumbLike>(breadcrumb: T): T {
  for (const field of PRIVATE_URL_FIELDS) {
    if (breadcrumb.data?.[field]) {
      breadcrumb.data[field] = stripUrlDetails(breadcrumb.data[field]);
    }
  }
  return breadcrumb;
}

export function isMonitoredDeployment(deploymentEnvironment: string | undefined): boolean {
  return deploymentEnvironment === "preview" || deploymentEnvironment === "production";
}
