import { CalendarNavigation } from "./calendar/CalendarNavigation";

export function CalendarNavigationControls({
  weekStart,
  isMobile,
  canMovePrev,
  moveRange,
  onPrev,
  onNext,
  onToday,
}: {
  weekStart: Date;
  isMobile: boolean;
  canMovePrev: boolean;
  moveRange: (direction: -1 | 1) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <CalendarNavigation
      weekStart={weekStart}
      isMobile={isMobile}
      canGoPrev={canMovePrev}
      onPrev={() => (isMobile ? moveRange(-1) : onPrev())}
      onNext={() => (isMobile ? moveRange(1) : onNext())}
      onToday={onToday}
    />
  );
}
