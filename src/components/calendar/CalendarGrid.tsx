import type { ForecastSession } from "@shared/forecast-types";
import { sameDay } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { SessionEvent } from "./SessionEvent";

export function dayLabel(day: Date) {
  return `${day.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()} ${day.toLocaleDateString("en-US", { month: "short" })} ${day.getDate()}`;
}

export function CalendarGrid({
  days,
  sessions,
  today,
}: {
  days: Date[];
  sessions: ForecastSession[];
  today: Date;
}) {
  const startHour = 6;
  const endHour = 20;
  const hourHeight = 60;
  return (
    <div
      role="region"
      aria-label="Weekly forecast calendar"
      className="grid overflow-hidden rounded border border-border bg-card"
      style={{ gridTemplateColumns: `40px repeat(${days.length}, minmax(0, 1fr))` }}
    >
      <div className="relative mt-16 text-xs tabular-nums text-muted-foreground" aria-label="Hours">
        {Array.from({ length: endHour - startHour + 1 }, (_, index) => (
          <span
            key={index}
            className="absolute right-1"
            style={{
              top: index * hourHeight,
              transform: index === endHour - startHour ? "translateY(-100%)" : undefined,
            }}
          >
            {String(startHour + index).padStart(2, "0")}:00
          </span>
        ))}
      </div>
      {days.map((day) => {
        const matches = sessions
          .filter((s) => sameDay(new Date(s.start), day))
          .sort(
            (a, b) => a.start.localeCompare(b.start) || a.location.id.localeCompare(b.location.id),
          );
        const isToday = sameDay(day, today);
        return (
          <div
            key={day.toDateString()}
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
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0, transparent 59px, var(--border) 59px, var(--border) 60px)",
              }}
            >
              {!matches.length && (
                <p className="absolute top-1/2 w-full text-center text-xs text-muted-foreground">
                  No match
                </p>
              )}
              {matches.map((session) => {
                const start = new Date(session.start);
                const end = new Date(session.end);
                return (
                  <SessionEvent
                    key={`${session.location.id}-${session.start}-${session.end}-${session.matchType}`}
                    session={session}
                    dayLabel={dayLabel(day)}
                    style={{
                      top: (start.getHours() + start.getMinutes() / 60 - startHour) * hourHeight,
                      height: ((end.getTime() - start.getTime()) / 3600000) * hourHeight,
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
