import type { CalendarConfig } from "@shared/types";

/**
 * Build URLSearchParams from config (shared by calendar and forecast endpoints)
 */
export function buildConfigParams(config: CalendarConfig): URLSearchParams {
  const params = new URLSearchParams({
    location: config.location,
    model: config.model.toString(),
    minSessionHours: config.minSessionHours.toString(),
    windEnabled: config.windEnabled.toString(),
    windMin: config.windMin.toString(),
    windMax: config.windMax.toString(),
    waveEnabled: config.waveEnabled.toString(),
  });
  if (config.waveEnabled) {
    params.set("waveSource", config.waveSource);
    params.set("waveHeightMin", config.waveHeightMin.toString());
    params.set("waveHeightMax", config.waveHeightMax.toString());
    params.set("wavePeriodMin", config.wavePeriodMin.toString());
  }
  return params;
}

/**
 * Build the API URL with query params from config
 */
export function buildApiUrl(config: CalendarConfig): string {
  return `/api/calendar?${buildConfigParams(config)}`;
}

/**
 * Build a full URL (for subscribe buttons and sharing)
 */
export function buildFullUrl(
  config: CalendarConfig,
  baseUrl: string = window.location.origin,
): string {
  const apiUrl = buildApiUrl(config);
  return `${baseUrl}${apiUrl}`;
}

/**
 * Build webcal:// URL for Apple/Outlook calendar subscriptions
 */
export function buildWebcalUrl(config: CalendarConfig): string {
  const fullUrl = buildFullUrl(config);
  return fullUrl.replace(/^https?:/, "webcal:");
}

/**
 * Build Google Calendar subscribe URL
 */
export function buildGoogleCalendarUrl(config: CalendarConfig): string {
  const webcalUrl = buildWebcalUrl(config);
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
}

/**
 * Build Outlook Web calendar subscription URL
 */
export function buildOutlookUrl(config: CalendarConfig): string {
  const fullUrl = buildFullUrl(config);
  return `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(fullUrl)}`;
}
