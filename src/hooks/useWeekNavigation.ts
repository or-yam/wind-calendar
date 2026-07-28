import { useState, useCallback, useEffect, useRef } from "react";
import { getWeekStart, addDays } from "../lib/date-utils";

interface UseWeekNavigationResult {
  weekStart: Date;
  goToToday: () => void;
  goToPrev: () => void;
  goToNext: () => void;
}

const START_ON_SUNDAY = true;

export function useWeekNavigation(items: { start: string }[]): UseWeekNavigationResult {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date(), START_ON_SUNDAY));
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    hasNavigatedRef.current = false;
  }, [items]);

  useEffect(() => {
    if (items.length > 0 && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      let earliestStart = items[0].start;
      for (let i = 1; i < items.length; i++) {
        if (items[i].start < earliestStart) earliestStart = items[i].start;
      }
      setWeekStart(getWeekStart(new Date(earliestStart), START_ON_SUNDAY));
    }
  }, [items]);

  const goToToday = useCallback(() => {
    setWeekStart(getWeekStart(new Date(), START_ON_SUNDAY));
  }, []);

  const goToPrev = useCallback(() => {
    setWeekStart((prev) => addDays(prev, -7));
  }, []);

  const goToNext = useCallback(() => {
    setWeekStart((prev) => addDays(prev, 7));
  }, []);

  return { weekStart, goToToday, goToPrev, goToNext };
}
