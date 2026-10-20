import { useRef } from "react";
import type { ForecastCalendarProps } from "./forecastCalendarTypes";
import { addDays } from "@/lib/date-utils";
import { intersects } from "./calendar/sessionSegments";
import { useMobileCalendar } from "@/hooks/useMobileCalendar";
import { useCalendarPresentation } from "@/hooks/useCalendarPresentation";
import { CalendarRequestStatus } from "./CalendarRequestStatus";
import { CalendarNavigationControls } from "./CalendarNavigationControls";
import { CalendarDayControls } from "./CalendarDayControls";
import { CalendarForecastContent } from "./CalendarForecastContent";
import { useCalendarTodayFocus } from "@/hooks/useCalendarTodayFocus";

export function ForecastCalendar({
  sessions,
  isPending,
  error,
  weekStart,
  today = new Date(),
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onToday,
  mode: controlledMode,
  onModeChange,
  resetKey = "",
}: ForecastCalendarProps) {
  const isMobile = useMobileCalendar();
  const {
    mode,
    changeMode,
    weekDays,
    selectedDay,
    visibleDays,
    canMovePrev,
    canMoveNext,
    selectDay,
    selectToday,
    moveRange,
  } = useCalendarPresentation({
    weekStart,
    today,
    isMobile,
    canGoPrev,
    canGoNext,
    onPrev,
    onNext,
    onToday,
    controlledMode,
    onModeChange,
    resetKey,
  });
  const calendarRef = useRef<HTMLDivElement>(null);
  const focusToday = useCalendarTodayFocus(calendarRef, isPending);
  const calendarDays = isMobile ? visibleDays : weekDays;
  const weekSessions = sessions.filter((s) => intersects(s, weekStart, addDays(weekStart, 7)));
  const visibleSessions = weekSessions.filter((session) =>
    calendarDays.some((day) => intersects(session, day, addDays(day, 1))),
  );
  return (
    <section className="night-section" aria-label="Upcoming sessions">
      <div className="content-wrap" ref={calendarRef}>
        <h2 className="sticker-heading">Upcoming sessions</h2>
        <CalendarNavigationControls
          weekStart={weekStart}
          isMobile={isMobile}
          canMovePrev={canMovePrev}
          canMoveNext={canMoveNext}
          moveRange={moveRange}
          onPrev={onPrev}
          onNext={onNext}
          onToday={() => {
            focusToday();
            selectToday();
          }}
        />
        <CalendarDayControls
          isMobile={isMobile}
          days={weekDays}
          selectedDay={selectedDay}
          mode={mode}
          onSelectDay={selectDay}
          onModeChange={changeMode}
        />
        <CalendarForecastContent
          days={calendarDays}
          sessions={weekSessions}
          today={today}
          weekStart={weekStart}
          isPending={isPending}
          error={error}
        />
        <CalendarRequestStatus
          isPending={isPending}
          error={error}
          hasSessions={visibleSessions.length > 0}
          isMobile={isMobile}
          mode={mode}
        />
      </div>
    </section>
  );
}
