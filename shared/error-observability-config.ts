export function getErrorReportingOrigin(dsn: string | undefined): string | undefined {
  if (!dsn) return undefined;

  try {
    const url = new URL(dsn);
    if (url.protocol !== "https:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}
