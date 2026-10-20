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

export function segmentHours(session: ForecastSession, day: Date, elapsedAxis = false) {
  const next = addDays(day, 1);
  const startMs = Math.max(Date.parse(session.start), day.getTime());
  const endMs = Math.min(Date.parse(session.end), next.getTime());
  if (elapsedAxis)
    return {
      start: (startMs - day.getTime()) / 3_600_000,
      end: (endMs - day.getTime()) / 3_600_000,
    };
  return {
    start: startMs === day.getTime() ? 0 : hour(new Date(startMs)),
    end: endMs === next.getTime() ? 24 : hour(new Date(endMs)),
  };
}

export function weekHours(sessions: ForecastSession[], weekStart: Date, elapsedAxis = false) {
  const segments = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).flatMap((day) =>
    sessions
      .filter((s) => intersects(s, day, addDays(day, 1)))
      .map((s) => segmentHours(s, day, elapsedAxis)),
  );
  return {
    startHour: Math.floor(Math.min(6, ...segments.map((s) => s.start))),
    endHour: Math.ceil(Math.max(20, ...segments.map((s) => s.end))),
  };
}

export function segmentTime(hour: number) {
  return `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.floor((hour * 60) % 60)).padStart(2, "0")}`;
}

export function sessionSegmentTime(value: string, fallbackHour: number, showOffset: boolean) {
  const date = new Date(value);
  if (!showOffset) return segmentTime(fallbackHour);
  const text = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const offsetMinutes = -date.getTimezoneOffset();
  const offset = `${offsetMinutes < 0 ? "-" : "+"}${String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0")}:${String(Math.abs(offsetMinutes) % 60).padStart(2, "0")}`;
  return `${text} UTC${offset}`;
}
