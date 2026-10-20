import type { ForecastSession } from "@shared/forecast-types";
import { addDays } from "@/lib/date-utils";
import { laneBox, overlapLanes, sessionKey } from "./overlapLanes";
import { segmentHours, segmentTime, sessionSegmentTime } from "./sessionSegments";
import { SessionEvent } from "./SessionEvent";

export function DayEvents({
  day,
  dayName,
  sessions,
  startHour,
  hourHeight,
  elapsedAxis,
  selectedKey,
  detailsId,
  onActivate,
}: {
  day: Date;
  dayName: string;
  sessions: ForecastSession[];
  startHour: number;
  hourHeight: number;
  elapsedAxis: boolean;
  selectedKey: string | null;
  detailsId: string;
  onActivate: (session: ForecastSession, button: HTMLButtonElement) => void;
}) {
  return overlapLanes(sessions).map(({ session, lane, lanes }) => {
    const { start, end } = segmentHours(session, day, elapsedAxis);
    const segmentStart = Math.max(Date.parse(session.start), day.getTime());
    const segmentEnd = Math.min(Date.parse(session.end), addDays(day, 1).getTime());
    return (
      <SessionEvent
        key={sessionKey(session)}
        session={session}
        expanded={selectedKey === sessionKey(session)}
        detailsId={detailsId}
        onActivate={(button) => onActivate(session, button)}
        dayLabel={dayName}
        startTime={
          !elapsedAxis && start === 0
            ? segmentTime(start)
            : sessionSegmentTime(new Date(segmentStart).toISOString(), start, elapsedAxis)
        }
        endTime={
          !elapsedAxis && end === 24
            ? segmentTime(end)
            : sessionSegmentTime(new Date(segmentEnd).toISOString(), end, elapsedAxis)
        }
        style={{
          ...laneBox(lane, lanes),
          top: (start - startHour) * hourHeight,
          height: (end - start) * hourHeight,
        }}
      />
    );
  });
}
