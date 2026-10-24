import { formatTime } from "@/lib/date-utils";
import { useLocale } from "@/hooks/useLocale";
export function HourScale({
  startHour,
  endHour,
  hourHeight,
}: {
  startHour: number;
  endHour: number;
  hourHeight: number;
}) {
  const { t, locale } = useLocale();
  return (
    <div
      className="relative mt-16 text-xs tabular-nums text-muted-foreground"
      aria-label={t("localClockHours")}
    >
      {Array.from({ length: endHour - startHour + 1 }, (_, index) => (
        <span
          key={index}
          dir="ltr"
          className="absolute end-1"
          style={{
            top: index * hourHeight,
            transform: index === endHour - startHour ? "translateY(-100%)" : undefined,
          }}
        >
          {startHour + index === 24 ? "24:00" : formatTime(startHour + index, 0, locale)}
        </span>
      ))}
    </div>
  );
}
