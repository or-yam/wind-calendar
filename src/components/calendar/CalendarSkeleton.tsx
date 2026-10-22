import { useLocale } from "@/hooks/useLocale";
import { Skeleton } from "@/components/ui/skeleton";

const HOUR_HEIGHT = 36;
const VISIBLE_HOURS = 14;
const PLACEHOLDER_START_HOUR = 2;
const PLACEHOLDER_DURATION_HOURS = 3;
const PLACEHOLDER_OFFSET_VARIANTS = 3;

export function CalendarSkeleton({ dayCount }: { dayCount: number }) {
  const { t } = useLocale();
  return (
    <div
      role="region"
      aria-label={t("weeklyForecastCalendar")}
      aria-busy="true"
      className="overflow-hidden rounded border border-border bg-card"
    >
      <div
        aria-hidden="true"
        className="grid"
        style={{ gridTemplateColumns: `40px repeat(${dayCount}, minmax(0, 1fr))` }}
      >
        <div />
        {Array.from({ length: dayCount }, (_, i) => (
          <div key={i} className="border-s border-border">
            <div className="flex h-16 items-center justify-center border-b border-border">
              <Skeleton className="h-8 w-8" />
            </div>
            <div
              className="relative"
              style={{
                height: VISIBLE_HOURS * HOUR_HEIGHT,
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_HEIGHT - 1}px, var(--border) ${HOUR_HEIGHT - 1}px, var(--border) ${HOUR_HEIGHT}px)`,
              }}
            >
              <Skeleton
                className="absolute inset-x-1"
                style={{
                  top: (PLACEHOLDER_START_HOUR + (i % PLACEHOLDER_OFFSET_VARIANTS)) * HOUR_HEIGHT,
                  height: PLACEHOLDER_DURATION_HOURS * HOUR_HEIGHT,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
