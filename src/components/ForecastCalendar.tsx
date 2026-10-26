import { useLocale } from "@/hooks/useLocale";
import { useRef } from "react";
import type { ForecastCalendarProps } from "./forecastCalendarTypes";
import { addDays } from "@/lib/date-utils";
import { intersects } from "./calendar/sessionSegments";
import { useMobileView } from "@/hooks/useMobileView";
import { useCalendarMode } from "@/hooks/useCalendarMode";
import { useMobileCalendarNavigation } from "@/hooks/useMobileCalendarNavigation";
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
  resetKey = "",
}: ForecastCalendarProps) {
  const { t } = useLocale();
  const isMobile = useMobileView();
  const { mode, changeMode } = useCalendarMode();
  const {
    weekDays,
    selectedDay,
    visibleDays,
    canMovePrev,
    canMoveNext,
    selectDay,
    selectToday,
    moveRange,
  } = useMobileCalendarNavigation({
    weekStart,
    today,
    isMobile,
    canGoPrev,
    canGoNext,
    onPrev,
    onNext,
    onToday,
    mode,
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
    <section className="night-section" aria-label={t("upcomingSessions")}>
      <div className="content-wrap" ref={calendarRef}>
        <h2 className="sticker-heading">{t("upcomingSessions")}</h2>
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
