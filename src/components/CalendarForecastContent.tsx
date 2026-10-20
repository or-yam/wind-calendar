import type { ForecastSession } from "@shared/forecast-types";
import { CalendarGrid } from "./calendar/CalendarGrid";
import { CalendarSkeleton } from "./calendar/CalendarSkeleton";

export function CalendarForecastContent({
  days,
  sessions,
  today,
  weekStart,
  isPending,
  error,
}: {
  days: Date[];
  sessions: ForecastSession[];
  today: Date;
  weekStart: Date;
  isPending: boolean;
  error: Error | null;
}) {
  if (isPending) return <CalendarSkeleton dayCount={days.length} />;
  if (error) return <p className="py-8 text-center text-sm text-red-400">{error.message}</p>;
  return (
    <>
      <CalendarGrid days={days} sessions={sessions} weekStart={weekStart} today={today} />
      <p className="mt-3 text-xs text-muted-foreground">
        Local time · {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </p>
    </>
  );
}
