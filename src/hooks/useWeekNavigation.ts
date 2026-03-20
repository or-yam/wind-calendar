import { useState, useCallback } from "react";
import { getWeekStart, addDays } from "../lib/date-utils";

interface UseWeekNavigationResult {
  weekStart: Date;
  startOnSunday: boolean;
  goToToday: () => void;
  goToPrev: () => void;
  goToNext: () => void;
  goToFirstItem: () => void;
  toggleWeekStart: (startOnSunday: boolean) => void;
}

const WEEK_START_KEY = "weekStartsOnSunday";

/**
 * Detect default week start based on user locale
 * Returns true if week should start on Sunday
 */
function getDefaultWeekStart(): boolean {
  try {
    const locale = new Intl.Locale(navigator.language);
    if ("weekInfo" in locale && locale.weekInfo) {
      return (locale.weekInfo as { firstDay: number }).firstDay === 7; // 7 = Sunday, 1 = Monday
    }
  } catch {
    // Fallback if weekInfo not supported
  }

  // Fallback: Sunday for US/Israel locales, Monday for others
  const lang = navigator.language.toLowerCase();
  return lang.startsWith("en-us") || lang.startsWith("he");
}

export function useWeekNavigation(items: { start: string }[]): UseWeekNavigationResult {
  const [startOnSunday, setStartOnSunday] = useState(() => {
    try {
      const saved = localStorage.getItem(WEEK_START_KEY);
      if (saved !== null) {
        return saved === "1";
      }
      return getDefaultWeekStart();
    } catch {
      // Default to Sunday if localStorage fails
      return true;
    }
  });

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date(), startOnSunday));

  const goToWeek = useCallback(
    (date: Date) => {
      setWeekStart(getWeekStart(date, startOnSunday));
    },
    [startOnSunday],
  );

  const goToToday = useCallback(() => {
    goToWeek(new Date());
  }, [goToWeek]);

  const goToPrev = useCallback(() => {
    setWeekStart((prev) => addDays(prev, -7));
  }, []);

  const goToNext = useCallback(() => {
    setWeekStart((prev) => addDays(prev, 7));
  }, []);

  const goToFirstItem = useCallback(() => {
    if (items.length === 0) {
      goToToday();
      return;
    }
    let earliestStart = items[0].start;
    for (let i = 1; i < items.length; i++) {
      if (items[i].start < earliestStart) {
        earliestStart = items[i].start;
      }
    }
    goToWeek(new Date(earliestStart));
  }, [items, goToToday, goToWeek]);

  const toggleWeekStart = useCallback(
    (startOnSunday: boolean) => {
      setStartOnSunday(startOnSunday);

      // Save preference
      try {
        localStorage.setItem(WEEK_START_KEY, startOnSunday ? "1" : "0");
      } catch {
        // localStorage may not be available
      }

      // Re-calculate week start for current date
      const midWeek = addDays(weekStart, 3);
      setWeekStart(getWeekStart(midWeek, startOnSunday));
    },
    [weekStart],
  );

  return {
    weekStart,
    startOnSunday,
    goToToday,
    goToPrev,
    goToNext,
    goToFirstItem,
    toggleWeekStart,
  };
}
