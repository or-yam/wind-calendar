import { useEffect, useRef, useState } from "react";
import { addDays, sameDay } from "@/lib/date-utils";
import type { CalendarMode } from "@/components/calendar/CalendarMobileControls";

const dayCount = (mode: CalendarMode) => (mode === "day" ? 1 : 3);

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
  const [selection, setSelection] = useState<{ week: number; day: number } | null>(null);
  const previousResetKey = useRef(resetKey);
  useEffect(() => {
    if (previousResetKey.current === resetKey) return;
    previousResetKey.current = resetKey;
    setSelection(null);
  }, [resetKey]);
  const count = dayCount(mode);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const initialDay = today >= weekStart && today < addDays(weekStart, 7) ? today : weekStart;
  const initialIndex = Math.max(
    weekDays.findIndex((day) => sameDay(day, initialDay)),
    0,
  );
  const selectedIndex = selection?.week === weekStart.getTime() ? selection.day : initialIndex;
  const selectedDay = weekDays[selectedIndex];
  const rangeStartIndex = Math.min(selectedIndex, 7 - count);
  const canMoveNext = canGoNext || (isMobile && rangeStartIndex < 7 - count);
  const canMovePrev = canGoPrev || (isMobile && rangeStartIndex > 0);
  const visibleDays = Array.from({ length: count }, (_, i) =>
    addDays(weekDays[rangeStartIndex], i),
  );
  const selectDay = (day: Date) =>
    setSelection({
      week: weekStart.getTime(),
      day: weekDays.findIndex((item) => sameDay(item, day)),
    });
  const selectToday = () => {
    setSelection({
      week: weekStart.getTime(),
      day: Math.max(
        weekDays.findIndex((day) => sameDay(day, today)),
        0,
      ),
    });
    onToday();
  };
  const moveRange = (direction: -1 | 1) => {
    if (direction === 1 && !canMoveNext) return;
    const candidate = addDays(weekDays[rangeStartIndex], direction * count);
    if (candidate < weekStart) {
      if (canGoPrev) {
        onPrev();
        setSelection({ week: addDays(weekStart, -7).getTime(), day: 6 });
      } else setSelection({ week: weekStart.getTime(), day: 0 });
      return;
    }
    if (candidate >= addDays(weekStart, 7)) {
      if (!canGoNext) return;
      onNext();
      setSelection({ week: addDays(weekStart, 7).getTime(), day: 0 });
      return;
    }
    setSelection({
      week: weekStart.getTime(),
      day: Math.max(
        weekDays.findIndex((day) => sameDay(day, candidate)),
        0,
      ),
    });
  };
  return {
    mode,
    weekDays,
    selectedDay,
    visibleDays,
    canMovePrev,
    canMoveNext,
    selectDay,
    selectToday,
    moveRange,
  };
}
