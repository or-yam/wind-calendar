import { useLocale } from "@/hooks/useLocale";
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
  const { t, locale, direction } = useLocale();
  return (
    <nav
      aria-label={t("weekNavigation")}
      className="mb-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-center"
    >
      <Button
        aria-label={isMobile ? t("previousRange") : undefined}
        className="min-h-11"
        variant="outline"
        onClick={onPrev}
        disabled={!canGoPrev}
      >
        <span aria-hidden="true" className="sm:hidden">
          {direction === "rtl" ? "→" : "←"}
        </span>
        <span className="hidden sm:inline">
          <span aria-hidden="true">{direction === "rtl" ? "→" : "←"}</span> {t("previousShort")}
        </span>
      </Button>
      <span className="week-range min-w-0 text-center text-sm font-bold tracking-wide uppercase">
        {formatWeekRange(weekStart, locale)}
      </span>
      <Button
        aria-label={isMobile ? t("nextRange") : undefined}
        className="min-h-11"
        variant="outline"
        onClick={onNext}
        disabled={!canGoNext}
      >
        <span aria-hidden="true" className="sm:hidden">
          {direction === "rtl" ? "←" : "→"}
        </span>
        <span className="hidden sm:inline">
          {t("next")} <span aria-hidden="true">{direction === "rtl" ? "←" : "→"}</span>
        </span>
      </Button>
      <Button
        variant="ghost"
        className="col-span-3 min-h-11 justify-self-center sm:col-span-1"
        onClick={onToday}
      >
        {t("today")}
      </Button>
    </nav>
  );
}
