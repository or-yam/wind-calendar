// Date utility functions for calendar operations

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Get the start of the week for a given date
 * @param date - The reference date
 * @param weekStartsOnSunday - If true, week starts on Sunday; otherwise Monday
 */
export function getWeekStart(date: Date, weekStartsOnSunday = false): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat

  if (weekStartsOnSunday) {
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
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startMonth = MONTH_NAMES[weekStart.getMonth()];
  const endMonth = MONTH_NAMES[weekEnd.getMonth()];
  const startYear = weekStart.getFullYear();
  const endYear = weekEnd.getFullYear();

  if (startYear !== endYear) {
    return `${startMonth} ${weekStart.getDate()}, ${startYear} – ${endMonth} ${weekEnd.getDate()}, ${endYear}`;
  }
  if (weekStart.getMonth() !== weekEnd.getMonth()) {
    return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${weekEnd.getDate()}, ${startYear}`;
  }
  return `${startMonth} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${startYear}`;
}

/**
 * Format time as HH:MM
 */
export function formatTime(hour: number, minute: number): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(hour)}:${pad(minute)}`;
}

/**
 * Get day names for a week
 */
export function getDayNames(weekStartsOnSunday: boolean): string[] {
  return weekStartsOnSunday
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}
