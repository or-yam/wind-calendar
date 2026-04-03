import { useState, useCallback, useEffect, useRef } from "react";
import { getWeekStart, addDays } from "../lib/date-utils";

interface UseWeekNavigationResult {
  weekStart: Date;
  startOnSunday: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  goToToday: () => void;
  goToPrev: () => void;
  goToNext: () => void;
  toggleWeekStart: (startOnSunday: boolean) => void;
}

const WEEK_START_KEY = "weekStartsOnSunday";

function getDefaultWeekStart(): boolean {
  try {
    const locale = new Intl.Locale(navigator.language);
    if ("weekInfo" in locale && locale.weekInfo) {
      return (locale.weekInfo as { firstDay: number }).firstDay === 7;
    }
  } catch {}
  const lang = navigator.language.toLowerCase();
  return lang.startsWith("en-us") || lang.startsWith("he");
}

export function useWeekNavigation(items: { start: string }[]): UseWeekNavigationResult {
  const [startOnSunday, setStartOnSunday] = useState(() => {
    try {
      const saved = localStorage.getItem(WEEK_START_KEY);
      if (saved !== null) return saved === "1";
      return getDefaultWeekStart();
    } catch {
      return true;
    }
  });

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date(), startOnSunday));
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
      setWeekStart(getWeekStart(new Date(earliestStart), startOnSunday));
    }
  }, [items, startOnSunday]);

  const goToToday = useCallback(() => {
    setWeekStart(getWeekStart(new Date(), startOnSunday));
  }, [startOnSunday]);

  const goToPrev = useCallback(() => {
    setWeekStart((prev) => addDays(prev, -7));
  }, []);

  const goToNext = useCallback(() => {
    setWeekStart((prev) => addDays(prev, 7));
  }, []);

  const toggleWeekStart = useCallback(
    (startOnSunday: boolean) => {
      setStartOnSunday(startOnSunday);
      try {
        localStorage.setItem(WEEK_START_KEY, startOnSunday ? "1" : "0");
      } catch {}
      const midWeek = addDays(weekStart, 3);
      setWeekStart(getWeekStart(midWeek, startOnSunday));
    },
    [weekStart],
  );

  const todayWeekStart = getWeekStart(new Date(), startOnSunday);

  let lastWeekStart: Date | null = null;
  if (items.length > 0) {
    let latestStart = items[0].start;
    for (let i = 1; i < items.length; i++) {
      if (items[i].start > latestStart) latestStart = items[i].start;
    }
    lastWeekStart = getWeekStart(new Date(latestStart), startOnSunday);
  }

  const canGoPrev = weekStart.getTime() > todayWeekStart.getTime();
  const canGoNext = lastWeekStart !== null && weekStart.getTime() < lastWeekStart.getTime();

  return {
    weekStart,
    startOnSunday,
    canGoPrev,
    canGoNext,
    goToToday,
    goToPrev,
    goToNext,
    toggleWeekStart,
  };
}
