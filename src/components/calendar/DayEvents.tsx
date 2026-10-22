import type { ForecastSession } from "@shared/forecast-types";
import { addDays, formatTimeFromDate } from "@/lib/date-utils";
import { laneBox, overlapLanes, sessionKey } from "./overlapLanes";
import { segmentHours } from "./sessionSegments";
import { SessionEvent } from "./SessionEvent";

export function DayEvents({
  day,
  dayName,
  sessions,
  startHour,
  hourHeight,
  selectedKey,
  detailsId,
  onActivate,
}: {
  day: Date;
  dayName: string;
  sessions: ForecastSession[];
  startHour: number;
  hourHeight: number;
  selectedKey: string | null;
  detailsId: string;
  onActivate: (session: ForecastSession, button: HTMLButtonElement) => void;
}) {
  return overlapLanes(sessions).map(({ session, lane, lanes }) => {
    const { start, end } = segmentHours(session, day);
    const nextDayMs = addDays(day, 1).getTime();
    const segmentStart = Math.max(Date.parse(session.start), day.getTime());
    const segmentEnd = Math.min(Date.parse(session.end), nextDayMs);
    return (
      <SessionEvent
        key={sessionKey(session)}
        session={session}
        expanded={selectedKey === sessionKey(session)}
        detailsId={detailsId}
        onActivate={(button) => onActivate(session, button)}
        dayLabel={dayName}
        startTime={formatTimeFromDate(new Date(segmentStart))}
        endTime={segmentEnd === nextDayMs ? "24:00" : formatTimeFromDate(new Date(segmentEnd))}
        style={{
          ...laneBox(lane, lanes),
          top: (start - startHour) * hourHeight,
          height: (end - start) * hourHeight,
        }}
      />
    );
  });
}
