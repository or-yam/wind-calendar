import type { ForecastSession } from "@shared/forecast-types";

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
  resetKey?: string;
}
