import { useEffect, useState } from "react";
import type { CalendarMode } from "@/components/calendar/CalendarMobileControls";

const STORAGE_KEY = "wind-calendar:calendar-view";

function readMode(fallback: CalendarMode = "three-days"): CalendarMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "day" ? "day" : "three-days";
  } catch {
    return fallback;
  }
}

export function useCalendarMode() {
  "use memo";
  const [mode, setMode] = useState(readMode);
  useEffect(() => {
    const controller = new AbortController();
    window.addEventListener("pageshow", () => setMode((current) => readMode(current)), {
      signal: controller.signal,
    });
    return () => controller.abort();
  }, []);
  const changeMode = (nextMode: CalendarMode) => {
    setMode(nextMode);
    try {
      localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      return;
    }
  };
  return { mode, changeMode };
}
