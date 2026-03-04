import type { CalendarConfig } from "@shared/types";

/**
 * Build the API URL with query params from config
 */
export function buildApiUrl(config: CalendarConfig): string {
  const params = new URLSearchParams({
    location: config.location,
    windMin: config.windMin.toString(),
    windMax: config.windMax.toString(),
    minSessionHours: config.minSessionHours.toString(),
    model: config.model.toString(),
  });
  return `/api/calendar?${params.toString()}`;
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
