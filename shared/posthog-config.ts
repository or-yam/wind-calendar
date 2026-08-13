export function getPostHogOrigin(host: string | undefined): string | undefined {
  if (!host) return undefined;

  try {
    const url = new URL(host);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function buildContentSecurityPolicy(isDev: boolean, postHogHost?: string): string {
  const postHogOrigin = getPostHogOrigin(postHogHost);
  const connectSources = [
    "'self'",
    postHogOrigin,
    ...(isDev ? ["http://localhost:*", "ws://localhost:*"] : []),
  ]
    .filter(Boolean)
    .join(" ");
  const scriptSources = ["'self'", ...(isDev ? ["'unsafe-inline'"] : [])].join(" ");

  return `default-src 'self'; script-src ${scriptSources}; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src ${connectSources}; img-src 'self' data:; frame-ancestors 'none'`;
}
