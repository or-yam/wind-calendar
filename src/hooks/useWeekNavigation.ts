import { useState, useCallback, useEffect, useRef } from "react";
import { getWeekStart, addDays } from "../lib/date-utils";

interface UseWeekNavigationResult {
  weekStart: Date;
  canGoPrev: boolean;
  goToToday: () => void;
  goToPrev: () => void;
  goToNext: () => void;
}

const START_ON_SUNDAY = true;

function clampToCurrentWeek(weekStart: Date): Date {
  const currentWeekStart = getWeekStart(new Date(), START_ON_SUNDAY);
  return weekStart < currentWeekStart ? currentWeekStart : weekStart;
}

export function useWeekNavigation(resetKey: string): UseWeekNavigationResult {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date(), START_ON_SUNDAY));
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
      const nextWeek = getWeekStart(now, START_ON_SUNDAY).getTime();
      if (nextWeek !== currentWeek) {
        currentWeek = nextWeek;
        setWeekStart((prev) => new Date(clampToCurrentWeek(prev)));
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
    setWeekStart(getWeekStart(new Date(), START_ON_SUNDAY));
  }, []);

  const goToPrev = useCallback(() => {
    setWeekStart((prev) => clampToCurrentWeek(addDays(prev, -7)));
  }, []);

  const goToNext = useCallback(() => {
    setWeekStart((prev) => addDays(clampToCurrentWeek(prev), 7));
  }, []);

  const visibleWeekStart = clampToCurrentWeek(weekStart);
  const canGoPrev = visibleWeekStart > getWeekStart(new Date(), START_ON_SUNDAY);

  return { weekStart: visibleWeekStart, canGoPrev, goToToday, goToPrev, goToNext };
}
