import { createEvents, type DateArray, type EventAttributes } from "ics";
import type { LocationSession } from "./location-sessions";
import { degreesToCardinal } from "./groupSessions";
import { toLocalTimeString } from "./timezone";
import { WIND_ICON, WAVE_ICON } from "../../shared/constants";

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

function formatWindPart(session: LocationSession): string {
  const windMin = Math.round(session.windMin);
  const windMax = Math.round(session.windMax);
  const wind = windMin === windMax ? `${windMin}kn` : `${windMin}-${windMax}kn`;
  return `Wind ${wind} ${session.dominantDirection}`;
}

function formatWaveCore(session: LocationSession): string {
  const height = session.waveAvg.toFixed(1);
  const period = session.wavePeriodAvg > 0 ? ` ${Math.round(session.wavePeriodAvg)}s` : "";
  return `${height}m${period} ${session.waveDominantDirection}`;
}

function formatWavePart(session: LocationSession): string {
  return `Waves ${formatWaveCore(session)}`;
}

function formatTitle(session: LocationSession): string {
  const suffix = ` — ${session.location.label}`;
  switch (session.matchType) {
    case "wind":
      return `${WIND_ICON} ${formatWindPart(session)}${suffix}`;
    case "wave":
      return `${WAVE_ICON} ${formatWavePart(session)}${suffix}`;
    case "both":
      return `${WIND_ICON}${WAVE_ICON} ${formatWindPart(session)} | ${formatWaveCore(session)} waves${suffix}`;
  }
}

function formatDescription(session: LocationSession): string {
  const conditions = session.conditions
    .map((c) => {
      const time = toLocalTimeString(c.date, session.location.tz);
      const speed = c.windSpeed != null ? `${c.windSpeed}kn` : "?kn";
      const gusts = c.windGusts != null ? `gusts ${c.windGusts}kn` : "";
      const dir = c.windDirection != null ? degreesToCardinal(c.windDirection) : "?";
      const wave =
        c.waveHeight != null
          ? `  waves ${c.waveHeight.toFixed(1)}m${c.wavePeriod != null ? ` ${Math.round(c.wavePeriod)}s` : ""}`
          : "";
      return `${time}  ${speed}  ${gusts}  ${dir}${wave}`;
    })
    .join("\n");
  return `Location: ${session.location.label}\n${conditions}`;
}

export function generateIcsEvents(sessions: LocationSession[], _tz?: string): string {
  const events: EventAttributes[] = sessions.map((session) => ({
    title: formatTitle(session),
    start: dateToTuple(session.start, "UTC") as DateArray,
    startInputType: "utc" as const,
    startOutputType: "utc" as const,
    end: dateToTuple(session.end, "UTC") as DateArray,
    endInputType: "utc" as const,
    endOutputType: "utc" as const,
    description: formatDescription(session),
  }));

  const { error, value } = createEvents(events, {
    calName: "Forecast",
  });

  if (error) {
    throw error;
  }

  return value!;
}
