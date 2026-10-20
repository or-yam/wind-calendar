import { sameDay } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { dayLabel } from "./DayColumn";

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
  return (
    <>
      <div className="mb-3 grid grid-cols-7 gap-1" role="group" aria-label="Select day">
        {days.map((day) => (
          <button
            key={day.toDateString()}
            type="button"
            aria-label={dayLabel(day)}
            aria-pressed={sameDay(selectedDay, day)}
            onClick={() => onSelectDay(day)}
            className={`min-h-11 rounded border text-center text-xs font-semibold ${
              sameDay(selectedDay, day)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground"
            }`}
          >
            <span className="block">{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
            {day.getDate()}
          </button>
        ))}
      </div>
      <div className="mb-4 flex justify-center gap-2" role="group" aria-label="Calendar view">
        <Button
          variant={mode === "three-days" ? "default" : "outline"}
          aria-pressed={mode === "three-days"}
          onClick={() => onModeChange("three-days")}
        >
          3 days
        </Button>
        <Button
          variant={mode === "day" ? "default" : "outline"}
          aria-pressed={mode === "day"}
          onClick={() => onModeChange("day")}
        >
          Day
        </Button>
      </div>
    </>
  );
}
