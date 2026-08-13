export function redactQueryValues<T extends { url: string }>(event: T): T {
  const url = new URL(event.url, window.location.origin);
  return { ...event, url: `${url.origin}${url.pathname}` };
}
