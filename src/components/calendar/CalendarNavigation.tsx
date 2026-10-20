import { formatWeekRange } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";

export function CalendarNavigation({
  weekStart,
  isMobile,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onToday,
}: {
  weekStart: Date;
  isMobile: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <nav
      aria-label="Week navigation"
      className="mb-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-center"
    >
      <Button
        aria-label={isMobile ? "Previous range" : undefined}
        className="min-h-11"
        variant="outline"
        onClick={onPrev}
        disabled={!canGoPrev}
      >
        <span className="sm:hidden">←</span>
        <span className="hidden sm:inline">← Prev</span>
      </Button>
      <span className="week-range min-w-0 text-center text-sm font-bold tracking-wide uppercase">
        {formatWeekRange(weekStart)}
      </span>
      <Button
        aria-label={isMobile ? "Next range" : undefined}
        className="min-h-11"
        variant="outline"
        onClick={onNext}
        disabled={!canGoNext}
      >
        <span className="sm:hidden">→</span>
        <span className="hidden sm:inline">Next →</span>
      </Button>
      <Button
        variant="ghost"
        className="col-span-3 min-h-11 justify-self-center sm:col-span-1"
        onClick={onToday}
      >
        Today
      </Button>
    </nav>
  );
}
