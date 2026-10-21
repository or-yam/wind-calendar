import { CalendarNavigation } from "./calendar/CalendarNavigation";

export function CalendarNavigationControls({
  weekStart,
  isMobile,
  canMovePrev,
  canMoveNext,
  moveRange,
  onPrev,
  onNext,
  onToday,
}: {
  weekStart: Date;
  isMobile: boolean;
  canMovePrev: boolean;
  canMoveNext: boolean;
  moveRange: (direction: -1 | 1) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  "use memo";
  return (
    <CalendarNavigation
      weekStart={weekStart}
      isMobile={isMobile}
      canGoPrev={canMovePrev}
      canGoNext={canMoveNext}
      onPrev={() => (isMobile ? moveRange(-1) : onPrev())}
      onNext={() => (isMobile ? moveRange(1) : onNext())}
      onToday={onToday}
    />
  );
}
