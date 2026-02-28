import { createEvents, type DateArray, type EventAttributes } from "ics";
import type { Session } from "./groupSessions";
import { degreesToCardinal } from "./groupSessions";
import { toLocalTimeString } from "./timezone";

export function dateToTuple(date: Date, tz: string): [number, number, number, number, number] {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    const raw = Number(part!.value);
    if (type === "hour" && raw === 24) return 0;
    return raw;
  };

  return [get("year"), get("month"), get("day"), get("hour"), get("minute")];
}

function formatTitle(session: Session, waveHeightMin: number): string {
  const windMin = Math.round(session.windMin);
  const windMax = Math.round(session.windMax);
  const wind = windMin === windMax ? `${windMin}kn` : `${windMin}-${windMax}kn`;

  let title = `Wind ${wind} ${session.dominantDirection}`;

  if (session.waveAvg > waveHeightMin) {
    title += ` | ${session.waveAvg.toFixed(1)}m waves`;
  }

  return title;
}

function formatDescription(session: Session, tz: string): string {
  return session.conditions
    .map((c) => {
      const time = toLocalTimeString(c.date, tz);
      const speed = c.windSpeed != null ? `${c.windSpeed}kn` : "?kn";
      const gusts = c.windGusts != null ? `gusts ${c.windGusts}kn` : "";
      const dir = c.windDirection != null ? degreesToCardinal(c.windDirection) : "?";
      return `${time}  ${speed}  ${gusts}  ${dir}`;
    })
    .join("\n");
}

export function generateIcsEvents(sessions: Session[], tz: string, waveHeightMin: number): string {
  const events: EventAttributes[] = sessions.map((session) => ({
    title: formatTitle(session, waveHeightMin),
    start: dateToTuple(session.start, "UTC") as DateArray,
    startInputType: "utc" as const,
    startOutputType: "utc" as const,
    end: dateToTuple(session.end, "UTC") as DateArray,
    endInputType: "utc" as const,
    endOutputType: "utc" as const,
    description: formatDescription(session, tz),
  }));

  const { error, value } = createEvents(events, {
    calName: "Wind Forecast",
  });

  if (error) {
    throw error;
  }

  return value!;
}
