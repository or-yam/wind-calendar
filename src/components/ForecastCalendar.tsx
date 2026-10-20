import { useLayoutEffect, useRef } from "react";
import type { ForecastSession } from "@shared/forecast-types";
import { addDays } from "@/lib/date-utils";
import { CalendarMobileControls } from "./calendar/CalendarMobileControls";
import { CalendarNavigation } from "./calendar/CalendarNavigation";
import { CalendarSkeleton } from "./calendar/CalendarSkeleton";
import { CalendarGrid } from "./calendar/CalendarGrid";
import { intersects } from "./calendar/sessionSegments";
import { useMobileCalendar } from "@/hooks/useMobileCalendar";
import { useMobileCalendarNavigation } from "@/hooks/useMobileCalendarNavigation";

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
  const {
    mode,
    setMode,
    weekDays,
    selectedDay,
    visibleDays,
    canMovePrev,
    selectDay,
    selectToday,
    moveRange,
  } = useMobileCalendarNavigation({
    weekStart,
    today,
    isMobile,
    canGoPrev,
    onPrev,
    onNext,
    onToday,
  });
  const calendarRef = useRef<HTMLDivElement>(null);
  const focusToday = useRef(false);
  const calendarDays = isMobile ? visibleDays : weekDays;
  const weekSessions = sessions.filter((s) => intersects(s, weekStart, addDays(weekStart, 7)));
  const visibleSessions = weekSessions.filter((session) =>
    calendarDays.some((day) => intersects(session, day, addDays(day, 1))),
  );
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
        <CalendarNavigation
          weekStart={weekStart}
          isMobile={isMobile}
          canGoPrev={canMovePrev}
          onPrev={() => (isMobile ? moveRange(-1) : onPrev())}
          onNext={() => (isMobile ? moveRange(1) : onNext())}
          onToday={() => {
            focusToday.current = true;
            selectToday();
          }}
        />
        {isMobile && (
          <CalendarMobileControls
            days={weekDays}
            selectedDay={selectedDay}
            mode={mode}
            onSelectDay={selectDay}
            onModeChange={setMode}
          />
        )}
        {isPending ? (
          <CalendarSkeleton dayCount={calendarDays.length} />
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-400">{error.message}</p>
        ) : (
          <CalendarGrid
            days={calendarDays}
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
                ? `No sessions match this ${isMobile ? (mode === "day" ? "day" : "range") : "week"}`
                : ""}
        </p>
      </div>
    </section>
  );
}
