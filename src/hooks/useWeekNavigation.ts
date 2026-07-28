import { useState, useCallback, useEffect, useRef } from "react";
import { getWeekStart, addDays } from "../lib/date-utils";

interface UseWeekNavigationResult {
  weekStart: Date;
  goToToday: () => void;
  goToPrev: () => void;
  goToNext: () => void;
}

const START_ON_SUNDAY = true;

export function useWeekNavigation(
  items: { start: string }[],
  resetKey: string,
): UseWeekNavigationResult {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date(), START_ON_SUNDAY));
  const previousResetKeyRef = useRef(resetKey);
  const shouldAutoNavigateRef = useRef(true);

  useEffect(() => {
    if (previousResetKeyRef.current !== resetKey) {
      previousResetKeyRef.current = resetKey;
      shouldAutoNavigateRef.current = true;
    }

    if (items.length === 0 || !shouldAutoNavigateRef.current) return;

    shouldAutoNavigateRef.current = false;
    let earliestStart = items[0].start;
    for (let i = 1; i < items.length; i++) {
      if (items[i].start < earliestStart) earliestStart = items[i].start;
    }
    setWeekStart(getWeekStart(new Date(earliestStart), START_ON_SUNDAY));
  }, [items, resetKey]);

  const goToToday = useCallback(() => {
    shouldAutoNavigateRef.current = false;
    setWeekStart(getWeekStart(new Date(), START_ON_SUNDAY));
  }, []);

  const goToPrev = useCallback(() => {
    shouldAutoNavigateRef.current = false;
    setWeekStart((prev) => addDays(prev, -7));
  }, []);

  const goToNext = useCallback(() => {
    shouldAutoNavigateRef.current = false;
    setWeekStart((prev) => addDays(prev, 7));
  }, []);

  return { weekStart, goToToday, goToPrev, goToNext };
}
