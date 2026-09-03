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

export function useWeekNavigation(resetKey: string): UseWeekNavigationResult {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date(), START_ON_SUNDAY));
  const previousResetKeyRef = useRef(resetKey);

  useEffect(() => {
    if (previousResetKeyRef.current === resetKey) return;
    previousResetKeyRef.current = resetKey;
    setWeekStart(getWeekStart(new Date(), START_ON_SUNDAY));
  }, [resetKey]);

  const goToToday = useCallback(() => {
    setWeekStart(getWeekStart(new Date(), START_ON_SUNDAY));
  }, []);

  const goToPrev = useCallback(() => {
    setWeekStart((prev) => {
      const currentWeekStart = getWeekStart(new Date(), START_ON_SUNDAY);
      const previousWeekStart = addDays(prev, -7);
      return previousWeekStart < currentWeekStart ? currentWeekStart : previousWeekStart;
    });
  }, []);

  const goToNext = useCallback(() => {
    setWeekStart((prev) => addDays(prev, 7));
  }, []);

  const canGoPrev = weekStart > getWeekStart(new Date(), START_ON_SUNDAY);

  return { weekStart, canGoPrev, goToToday, goToPrev, goToNext };
}
