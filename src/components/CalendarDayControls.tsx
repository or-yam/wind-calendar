import { CalendarMobileControls, type CalendarMode } from "./calendar/CalendarMobileControls";

export function CalendarDayControls({
  isMobile,
  days,
  selectedDay,
  mode,
  onSelectDay,
  onModeChange,
}: {
  isMobile: boolean;
  days: Date[];
  selectedDay: Date;
  mode: CalendarMode;
  onSelectDay: (day: Date) => void;
  onModeChange: (mode: CalendarMode) => void;
}) {
  if (!isMobile) return null;
  return (
    <CalendarMobileControls
      days={days}
      selectedDay={selectedDay}
      mode={mode}
      onSelectDay={onSelectDay}
      onModeChange={onModeChange}
    />
  );
}
