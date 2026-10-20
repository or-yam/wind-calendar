import { useState } from "react";
import type { CalendarMode } from "@/components/calendar/CalendarMobileControls";
import { useMobileCalendarNavigation } from "./useMobileCalendarNavigation";

export function useCalendarPresentation({
  weekStart,
  today,
  isMobile,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onToday,
  controlledMode,
  onModeChange,
  resetKey,
}: {
  weekStart: Date;
  today: Date;
  isMobile: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  controlledMode?: CalendarMode;
  onModeChange?: (mode: CalendarMode) => void;
  resetKey: string;
}) {
  const [localMode, setLocalMode] = useState<CalendarMode>("three-days");
  const mode = controlledMode ?? localMode;
  return {
    changeMode: onModeChange ?? setLocalMode,
    ...useMobileCalendarNavigation({
      weekStart,
      today,
      isMobile,
      canGoPrev,
      canGoNext,
      onPrev,
      onNext,
      onToday,
      mode,
      resetKey,
    }),
  };
}
