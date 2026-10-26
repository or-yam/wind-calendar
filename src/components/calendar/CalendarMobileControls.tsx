import { useLocale } from "@/hooks/useLocale";
import { sameDay } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { dayLabel } from "./DayColumn";
import { cn } from "@/lib/utils";

export type CalendarMode = "three-days" | "day";

export function CalendarMobileControls({
  days,
  selectedDay,
  mode,
  onSelectDay,
  onModeChange,
}: {
  days: Date[];
  selectedDay: Date;
  mode: CalendarMode;
  onSelectDay: (day: Date) => void;
  onModeChange: (mode: CalendarMode) => void;
}) {
  const { t, locale, intl } = useLocale();
  return (
    <>
      <div className="mb-3 grid grid-cols-7 gap-1" role="group" aria-label={t("selectDay")}>
        {days.map((day) => (
          <button
            key={day.toDateString()}
            type="button"
            aria-label={dayLabel(day, locale)}
            aria-pressed={sameDay(selectedDay, day)}
            onClick={() => onSelectDay(day)}
            className={cn(
              "min-h-11 rounded border text-center text-xs font-semibold",
              sameDay(selectedDay, day)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            <span className="block">{day.toLocaleDateString(intl, { weekday: "short" })}</span>
            {day.getDate()}
          </button>
        ))}
      </div>
      <div className="mb-4 flex justify-center gap-2" role="group" aria-label={t("calendarView")}>
        <Button
          variant={mode === "three-days" ? "default" : "outline"}
          aria-pressed={mode === "three-days"}
          onClick={() => onModeChange("three-days")}
        >
          {t("threeDays")}
        </Button>
        <Button
          variant={mode === "day" ? "default" : "outline"}
          aria-pressed={mode === "day"}
          onClick={() => onModeChange("day")}
        >
          {t("day")}
        </Button>
      </div>
    </>
  );
}
