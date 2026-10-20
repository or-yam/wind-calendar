import type { ForecastSession } from "@shared/forecast-types";
import { addDays, sameDay } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { overlapLanes, laneBox, sessionKey } from "./overlapLanes";
import { intersects, segmentHours, segmentTime, sessionSegmentTime } from "./sessionSegments";
import { SessionEvent } from "./SessionEvent";

export function dayLabel(day: Date) {
  return `${day.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()} ${day.toLocaleDateString("en-US", { month: "short" })} ${day.getDate()}`;
}

export function DayColumn({
  day,
  sessions,
  today,
  startHour,
  endHour,
  hourHeight,
  selectedKey,
  detailsId,
  onActivate,
}: {
  day: Date;
  sessions: ForecastSession[];
  today: Date;
  startHour: number;
  endHour: number;
  hourHeight: number;
  selectedKey: string | null;
  detailsId: string;
  onActivate: (session: ForecastSession, button: HTMLButtonElement) => void;
}) {
  const matches = sessions.filter((s) => intersects(s, day, addDays(day, 1)));
  const isToday = sameDay(day, today);
  return (
    <div
      role="group"
      aria-label={`${dayLabel(day)}${matches.length ? "" : ": No sessions"}`}
      data-today={isToday}
      tabIndex={-1}
      className={cn(
        "min-w-0 border-l border-border outline-offset-[-2px]",
        isToday && "bg-primary/5",
      )}
    >
      <div className="flex h-16 flex-col items-center justify-center border-b border-border text-xs uppercase text-muted-foreground">
        {day.toLocaleDateString("en-US", { weekday: "short" })}
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-xl font-bold text-foreground",
            isToday && "bg-primary text-primary-foreground",
          )}
        >
          {day.getDate()}
        </span>
      </div>
      <div
        className="relative"
        style={{
          height: (endHour - startHour) * hourHeight,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${hourHeight - 1}px, var(--border) ${hourHeight - 1}px, var(--border) ${hourHeight}px)`,
        }}
      >
        {!matches.length && (
          <p className="absolute top-1/2 w-full text-center text-xs text-muted-foreground">
            No match
          </p>
        )}
        {overlapLanes(matches).map(({ session, lane, lanes }) => {
          const { start, end } = segmentHours(session, day);
          return (
            <SessionEvent
              key={sessionKey(session)}
              session={session}
              expanded={selectedKey === sessionKey(session)}
              detailsId={detailsId}
              onActivate={(button) => onActivate(session, button)}
              dayLabel={dayLabel(day)}
              startTime={
                start === 0
                  ? segmentTime(start)
                  : sessionSegmentTime(session.start, start, session.end)
              }
              endTime={
                end === 24 ? segmentTime(end) : sessionSegmentTime(session.end, end, session.start)
              }
              style={{
                ...laneBox(lane, lanes),
                top: (start - startHour) * hourHeight,
                height: (end - start) * hourHeight,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
