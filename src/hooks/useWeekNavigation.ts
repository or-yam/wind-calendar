import { useState, useCallback, useEffect, useRef } from "react";
import { getWeekStart, addDays } from "../lib/date-utils";

interface UseWeekNavigationResult {
  weekStart: Date;
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
    setWeekStart((prev) => addDays(prev, -7));
  }, []);

  const goToNext = useCallback(() => {
    setWeekStart((prev) => addDays(prev, 7));
  }, []);

  return { weekStart, goToToday, goToPrev, goToNext };
}
