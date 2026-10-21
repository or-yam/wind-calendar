import type { ForecastSession } from "@shared/forecast-types";
import { addDays } from "@/lib/date-utils";

export function intersects(session: ForecastSession, start: Date, end: Date) {
  return Date.parse(session.start) < end.getTime() && Date.parse(session.end) > start.getTime();
}

const hour = (date: Date) => date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

export function isOffsetTransitionWeek(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index);
    return (addDays(day, 1).getTime() - day.getTime()) / 3_600_000 !== 24;
  }).some(Boolean);
}

export function segmentHours(session: ForecastSession, day: Date) {
  const next = addDays(day, 1);
  const startMs = Math.max(Date.parse(session.start), day.getTime());
  const endMs = Math.min(Date.parse(session.end), next.getTime());
  const start = startMs === day.getTime() ? 0 : hour(new Date(startMs));
  const end = endMs === next.getTime() ? 24 : hour(new Date(endMs));
  return {
    start,
    end: end > start ? end : start + (endMs - startMs) / 3_600_000,
  };
}

export function weekHours(sessions: ForecastSession[], weekStart: Date) {
  const segments = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).flatMap((day) =>
    sessions.filter((s) => intersects(s, day, addDays(day, 1))).map((s) => segmentHours(s, day)),
  );
  return {
    startHour: Math.floor(Math.min(6, ...segments.map((s) => s.start))),
    endHour: Math.ceil(Math.max(20, ...segments.map((s) => s.end))),
  };
}
