import { useEffect, useRef, useState } from "react";
import { addDays } from "@/lib/date-utils";
import type { CalendarMode } from "@/components/calendar/CalendarMobileControls";

export function useMobileCalendarNavigation({
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
}: {
  weekStart: Date;
  today: Date;
  isMobile: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  mode: CalendarMode;
  resetKey: string;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const previousResetKey = useRef(resetKey);
  useEffect(() => {
    if (previousResetKey.current === resetKey) return;
    previousResetKey.current = resetKey;
    setSelectedDate(null);
  }, [resetKey]);

  const count = mode === "day" ? 1 : 3;
  const weekEnd = addDays(weekStart, 7);
  const inWeek = (day: Date) => day >= weekStart && day < weekEnd;
  const defaultDay = inWeek(today) ? today : weekStart;
  const selectedDay = selectedDate && inWeek(selectedDate) ? selectedDate : defaultDay;
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const rangeStartIndex = Math.min(selectedDay.getDay(), 7 - count);
  const visibleDays = weekDays.slice(rangeStartIndex, rangeStartIndex + count);
  const canMoveNext = canGoNext || (isMobile && rangeStartIndex < 7 - count);
  const canMovePrev = canGoPrev || (isMobile && rangeStartIndex > 0);

  const selectToday = () => {
    setSelectedDate(null);
    onToday();
  };
  const moveRange = (direction: -1 | 1) => {
    if (direction === 1 && !canMoveNext) return;
    if (direction === -1 && !canMovePrev) return;
    const nextIndex = rangeStartIndex + direction * count;
    if (nextIndex < 0) {
      if (canGoPrev) {
        setSelectedDate(addDays(weekStart, -1));
        onPrev();
      } else setSelectedDate(weekStart);
      return;
    }
    if (nextIndex >= 7) {
      setSelectedDate(weekEnd);
      onNext();
      return;
    }
    setSelectedDate(weekDays[nextIndex]);
  };
  return {
    weekDays,
    selectedDay,
    visibleDays,
    canMovePrev,
    canMoveNext,
    selectDay: setSelectedDate,
    selectToday,
    moveRange,
  };
}
