import { useState, useEffect, useCallback } from "react";
import { getWeekStart, addDays } from "../lib/date-utils";
import type { IcsEvent } from "../lib/ics-parser";

interface UseWeekNavigationResult {
  weekStart: Date;
  weekStartsOnMonday: boolean;
  goToToday: () => void;
  goToPrev: () => void;
  goToNext: () => void;
  goToFirstEvent: () => void;
  toggleWeekStart: (startOnMonday: boolean) => void;
}

const WEEK_START_KEY = "weekStartsOnMonday";

export function useWeekNavigation(events: IcsEvent[]): UseWeekNavigationResult {
  // Load week start preference from localStorage
  const [weekStartsOnMonday, setWeekStartsOnMonday] = useState(() => {
    try {
      const saved = localStorage.getItem(WEEK_START_KEY);
      return saved === "1";
    } catch {
      return false;
    }
  });

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date(), weekStartsOnMonday));

  const goToWeek = useCallback(
    (date: Date) => {
      setWeekStart(getWeekStart(date, weekStartsOnMonday));
    },
    [weekStartsOnMonday],
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
    (startOnMonday: boolean) => {
      setWeekStartsOnMonday(startOnMonday);

      // Save preference
      try {
        localStorage.setItem(WEEK_START_KEY, startOnMonday ? "1" : "0");
      } catch {
        // localStorage may not be available
      }

      // Re-calculate week start for current date
      const midWeek = addDays(weekStart, 3);
      setWeekStart(getWeekStart(midWeek, startOnMonday));
    },
    [weekStart],
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "t" || e.key === "T") {
        goToToday();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToPrev, goToNext, goToToday]);

  return {
    weekStart,
    weekStartsOnMonday,
    goToToday,
    goToPrev,
    goToNext,
    goToFirstEvent,
    toggleWeekStart,
  };
}
