import { useState, useCallback, useEffect, useRef } from "react";
import { getWeekStart, addDays } from "../lib/date-utils";

interface UseWeekNavigationResult {
  weekStart: Date;
  today: Date;
  canGoPrev: boolean;
  canGoNext: boolean;
  goToToday: () => void;
  goToPrev: () => void;
  goToNext: () => void;
}

const START_ON_SUNDAY = true;

function clampToAvailableWeeks(weekStart: Date): Date {
  const currentWeekStart = getWeekStart(new Date(), START_ON_SUNDAY);
  const lastWeekStart = addDays(currentWeekStart, 14);
  if (weekStart < currentWeekStart) return currentWeekStart;
  return weekStart > lastWeekStart ? lastWeekStart : weekStart;
}

export function useWeekNavigation(resetKey: string): UseWeekNavigationResult {
  "use no memo"; // Render-time clock reads must refresh even when navigation state is unchanged.
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date(), START_ON_SUNDAY));
  const [today, setToday] = useState(() => new Date());
  const previousResetKeyRef = useRef(resetKey);

  useEffect(() => {
    if (previousResetKeyRef.current === resetKey) return;
    previousResetKeyRef.current = resetKey;
    setWeekStart(getWeekStart(new Date(), START_ON_SUNDAY));
  }, [resetKey]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let currentWeek = getWeekStart(new Date(), START_ON_SUNDAY).getTime();
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date();
      setToday(new Date(now));
      const nextWeek = getWeekStart(now, START_ON_SUNDAY).getTime();
      if (nextWeek !== currentWeek) {
        currentWeek = nextWeek;
        setWeekStart((prev) => new Date(clampToAvailableWeeks(prev)));
      }
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timer = setTimeout(refresh, midnight.getTime() - now.getTime());
    };

    refresh();
    window.addEventListener("focus", refresh, { signal: controller.signal });
    document.addEventListener("visibilitychange", refresh, { signal: controller.signal });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setToday(new Date(now));
    setWeekStart(getWeekStart(now, START_ON_SUNDAY));
  }, []);

  const goToPrev = useCallback(() => {
    setWeekStart((prev) => clampToAvailableWeeks(addDays(prev, -7)));
  }, []);

  const goToNext = useCallback(() => {
    setWeekStart((prev) => clampToAvailableWeeks(addDays(clampToAvailableWeeks(prev), 7)));
  }, []);

  const visibleWeekStart = clampToAvailableWeeks(weekStart);
  const canGoPrev = visibleWeekStart > getWeekStart(new Date(), START_ON_SUNDAY);

  const canGoNext = visibleWeekStart < addDays(getWeekStart(new Date(), START_ON_SUNDAY), 14);

  return {
    weekStart: visibleWeekStart,
    today,
    canGoPrev,
    canGoNext,
    goToToday,
    goToPrev,
    goToNext,
  };
}
