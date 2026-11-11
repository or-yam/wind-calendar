import type { DaylightInterval } from "../types/wind-conditions.js";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export function sameDaylight(a?: DaylightInterval, b?: DaylightInterval): boolean {
  return (
    a?.sunrise.getTime() === b?.sunrise.getTime() && a?.sunset.getTime() === b?.sunset.getTime()
  );
}

export function legacyDaylightResolver(tz: string, sunrise: string, sunset: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const wallTime = (instant: number): number => {
    const parts = Object.fromEntries(
      formatter.formatToParts(instant).map((p) => [p.type, p.value]),
    );
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  };
  const cache = new Map<number, DaylightInterval | undefined>();

  return (date: Date): DaylightInterval | undefined => {
    if (!Number.isFinite(date.getTime())) return undefined;
    const local = new Date(wallTime(date.getTime()));
    const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
    if (cache.has(day)) return cache.get(day);

    const offsets = new Set<number>();
    for (let instant = day - DAY; instant <= day + 2 * DAY; instant += 6 * 60 * MINUTE) {
      offsets.add(wallTime(instant) - instant);
    }
    const boundary = (time: string, latest: boolean): Date | undefined => {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return undefined;
      const [hour, minute] = time.split(":").map(Number);
      const requested = day + (hour * 60 + minute) * MINUTE;
      const candidates = [...offsets]
        .map((offset) => requested - offset)
        .filter((instant) => wallTime(instant) === requested);
      if (candidates.length) {
        return new Date(latest ? Math.max(...candidates) : Math.min(...candidates));
      }
      // A nonexistent wall minute advances to the first valid minute on this local date.
      let firstWall = Infinity;
      let firstInstant: number | undefined;
      for (let instant = requested - DAY; instant <= requested + DAY; instant += MINUTE) {
        const wall = wallTime(instant);
        if (wall >= requested && wall < day + DAY && wall < firstWall) {
          firstWall = wall;
          firstInstant = instant;
        }
      }
      return firstInstant === undefined ? undefined : new Date(firstInstant);
    };
    const start = boundary(sunrise, false);
    const end = boundary(sunset, true);
    const interval = start && end && start < end ? { sunrise: start, sunset: end } : undefined;
    cache.set(day, interval);
    return interval;
  };
}
