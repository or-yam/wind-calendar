// Date utility functions for calendar operations

import { localeMetadata, type Locale } from "@/i18n/locale";

/**
 * Get the start of the week for a given date
 * @param date - The reference date
 * @param startOnSunday - If true, week starts on Sunday; otherwise Monday
 */
export function getWeekStart(date: Date, startOnSunday = false): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat

  if (startOnSunday) {
    // Start on Sunday: Sunday = 0, no change needed
    const diff = -dow;
    d.setDate(d.getDate() + diff);
  } else {
    // Start on Monday: Monday = 1
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
  }
  return d;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Check if two dates are the same day
 */
export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return sameDay(date, new Date());
}

/**
 * Format week range (e.g., "Jan 1 – 7, 2026")
 */
export function formatWeekRange(weekStart: Date, locale: Locale = "en"): string {
  const weekEnd = addDays(weekStart, 6);
  const formatter = new Intl.DateTimeFormat(localeMetadata[locale].intl, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return typeof formatter.formatRange === "function"
    ? formatter.formatRange(weekStart, weekEnd)
    : `${formatter.format(weekStart)} – ${formatter.format(weekEnd)}`;
}

/**
 * Format time as HH:MM
 */
export function formatTime(hour: number, minute: number, locale: Locale = "en"): string {
  const date = new Date(2000, 0, 1, hour, minute);
  return new Intl.DateTimeFormat(localeMetadata[locale].intl, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/**
 * Format time from Date object as HH:MM
 */
export function formatTimeFromDate(date: Date, locale: Locale = "en"): string {
  return formatTime(date.getHours(), date.getMinutes(), locale);
}

/**
 * Get day names for a week
 */
export function getDayNames(weekStartsOnSunday: boolean, locale: Locale = "en"): string[] {
  const formatter = new Intl.DateTimeFormat(localeMetadata[locale].intl, { weekday: "short" });
  const sunday = new Date(2024, 0, 7);
  const names = Array.from({ length: 7 }, (_, index) => formatter.format(addDays(sunday, index)));
  return weekStartsOnSunday ? names : [...names.slice(1), names[0]];
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(localeMetadata[locale].intl, options).format(value);
}
