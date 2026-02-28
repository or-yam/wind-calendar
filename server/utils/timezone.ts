const hourFormatter = (tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  });

const timeFormatter = (tz: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

/**
 * Returns the hour (0-23) in the given IANA timezone.
 * Example: getLocalHour(new Date('2024-01-01T05:00:00Z'), 'Asia/Jerusalem') -> 7
 */
export const getLocalHour = (date: Date, tz: string): number => {
  const parts = hourFormatter(tz).formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour");
  // Intl hour12:false can return "24" for midnight in some locales; normalize
  const raw = Number(hourPart!.value);
  return raw === 24 ? 0 : raw;
};

/**
 * Returns "HH:MM" in spot-local time.
 * Example: toLocalTimeString(new Date('2024-01-01T05:00:00Z'), 'Asia/Jerusalem') -> "07:00"
 */
export const toLocalTimeString = (date: Date, tz: string): string => timeFormatter(tz).format(date);
