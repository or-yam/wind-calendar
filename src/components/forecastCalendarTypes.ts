import type { ForecastSession } from "@shared/forecast-types";
import type { CalendarMode } from "./calendar/CalendarMobileControls";

export interface ForecastCalendarProps {
  sessions: ForecastSession[];
  isPending: boolean;
  error: Error | null;
  weekStart: Date;
  today?: Date;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  mode?: CalendarMode;
  onModeChange?: (mode: CalendarMode) => void;
  resetKey?: string;
}
