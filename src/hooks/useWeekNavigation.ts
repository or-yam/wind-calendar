import { useState, useCallback } from "react";
import { getWeekStart, addDays } from "../lib/date-utils";
import type { IcsEvent } from "../lib/ics-parser";

interface UseWeekNavigationResult {
  weekStart: Date;
  startOnSunday: boolean;
  goToToday: () => void;
  goToPrev: () => void;
  goToNext: () => void;
  goToFirstEvent: () => void;
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

export function useWeekNavigation(events: IcsEvent[]): UseWeekNavigationResult {
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

  const goToFirstEvent = useCallback(() => {
    if (events.length === 0) {
      goToToday();
      return;
    }
    let earliest = events[0];
    for (let i = 1; i < events.length; i++) {
      if (events[i].dtstart.date < earliest.dtstart.date) {
        earliest = events[i];
      }
    }
    goToWeek(earliest.dtstart.date);
  }, [events, goToToday, goToWeek]);

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
    goToFirstEvent,
    toggleWeekStart,
  };
}
