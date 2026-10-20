import type { ForecastSession } from "@shared/forecast-types";
import { addDays } from "@/lib/date-utils";

export function intersects(session: ForecastSession, start: Date, end: Date) {
  return Date.parse(session.start) < end.getTime() && Date.parse(session.end) > start.getTime();
}

const hour = (date: Date) => date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

export function segmentHours(session: ForecastSession, day: Date) {
  const next = addDays(day, 1);
  const startDate = new Date(session.start);
  const endDate = new Date(session.end);
  const start = Date.parse(session.start) <= day.getTime() ? 0 : hour(startDate);
  const end = Date.parse(session.end) >= next.getTime() ? 24 : hour(endDate);
  const segmentStart = start === 0 ? day : startDate;
  const segmentEnd = end === 24 ? next : endDate;
  const crossesOffset = segmentStart.getTimezoneOffset() !== segmentEnd.getTimezoneOffset();
  return {
    start,
    end:
      crossesOffset && end < 24
        ? start + (segmentEnd.getTime() - segmentStart.getTime()) / 3_600_000
        : end,
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

export function segmentTime(hour: number) {
  return `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.floor((hour * 60) % 60)).padStart(2, "0")}`;
}

export function sessionSegmentTime(value: string, fallbackHour: number, otherValue: string) {
  const date = new Date(value);
  const other = new Date(otherValue);
  if (date.getTimezoneOffset() === other.getTimezoneOffset()) return segmentTime(fallbackHour);
  const text = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const offsetHours = -date.getTimezoneOffset() / 60;
  const offset = `${offsetHours < 0 ? "-" : "+"}${String(Math.abs(offsetHours)).padStart(2, "0")}`;
  return `${text} UTC${offset}`;
}
