import { useLayoutEffect, useRef, useState } from "react";
import type { ForecastSession } from "@shared/forecast-types";
import { addDays, formatWeekRange } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { CalendarSkeleton } from "./calendar/CalendarSkeleton";
import { CalendarGrid } from "./calendar/CalendarGrid";
import { dayLabel } from "./calendar/DayColumn";
import { intersects } from "./calendar/sessionSegments";
import { useMobileCalendar } from "@/hooks/useMobileCalendar";

interface ForecastCalendarProps {
  sessions: ForecastSession[];
  isPending: boolean;
  error: Error | null;
  weekStart: Date;
  today?: Date;
  canGoPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function ForecastCalendar({
  sessions,
  isPending,
  error,
  weekStart,
  today = new Date(),
  canGoPrev,
  onPrev,
  onNext,
  onToday,
}: ForecastCalendarProps) {
  const isMobile = useMobileCalendar();
  const [selection, setSelection] = useState<{ week: number; day: number } | null>(null);
  const initialDay = today >= weekStart && today < addDays(weekStart, 7) ? today.getDay() : 0;
  const selectedDay = selection?.week === weekStart.getTime() ? selection.day : initialDay;
  const calendarRef = useRef<HTMLDivElement>(null);
  const focusToday = useRef(false);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekSessions = sessions.filter((s) => intersects(s, weekStart, addDays(weekStart, 7)));
  const visibleSessions = isMobile
    ? weekSessions.filter((s) => intersects(s, days[selectedDay], addDays(days[selectedDay], 1)))
    : weekSessions;
  useLayoutEffect(() => {
    if (!focusToday.current || isPending) return;
    calendarRef.current
      ?.querySelector<HTMLElement>('[data-today="true"]')
      ?.focus({ preventScroll: true });
    focusToday.current = false;
  });
  return (
    <section className="night-section" aria-label="Upcoming sessions">
      <div className="content-wrap" ref={calendarRef}>
        <h2 className="sticker-heading">Upcoming sessions</h2>
        <nav
          aria-label="Week navigation"
          className="mb-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-center"
        >
          <Button className="min-h-11" variant="outline" onClick={onPrev} disabled={!canGoPrev}>
            ← Prev
          </Button>
          <span className="min-w-0 text-center text-sm font-bold tracking-wide uppercase">
            {formatWeekRange(weekStart)}
          </span>
          <Button className="min-h-11" variant="outline" onClick={onNext}>
            Next →
          </Button>
          <Button
            variant="ghost"
            className="col-span-3 min-h-11 justify-self-center"
            onClick={() => {
              focusToday.current = true;
              setSelection(null);
              onToday();
            }}
          >
            Today
          </Button>
        </nav>
        {isMobile && (
          <select
            aria-label="Select day"
            value={selectedDay}
            onChange={(event) =>
              setSelection({ week: weekStart.getTime(), day: Number(event.target.value) })
            }
            className="mb-4 min-h-11 w-full rounded border border-border bg-card px-3 text-foreground"
          >
            {days.map((day, index) => (
              <option key={index} value={index}>
                {dayLabel(day)}
              </option>
            ))}
          </select>
        )}
        {isPending ? (
          <CalendarSkeleton dayCount={isMobile ? 1 : 7} />
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-400">{error.message}</p>
        ) : (
          <CalendarGrid
            days={isMobile ? [days[selectedDay]] : days}
            sessions={weekSessions}
            weekStart={weekStart}
            today={today}
          />
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Local time · {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </p>
        <p className="sr-only" role="status">
          {isPending
            ? "Loading the forecast"
            : error
              ? error.message
              : visibleSessions.length === 0
                ? `No sessions match this ${isMobile ? "day" : "week"}`
                : ""}
        </p>
      </div>
    </section>
  );
}
