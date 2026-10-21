import type { CalendarMode } from "./calendar/CalendarMobileControls";

export function CalendarRequestStatus({
  isPending,
  error,
  hasSessions,
  isMobile,
  mode,
}: {
  isPending: boolean;
  error: Error | null;
  hasSessions: boolean;
  isMobile: boolean;
  mode: CalendarMode;
}) {
  "use memo";
  const range = isMobile ? (mode === "day" ? "day" : "range") : "week";
  return (
    <p className="sr-only" role="status">
      {isPending
        ? "Loading the forecast"
        : error
          ? error.message
          : hasSessions
            ? ""
            : `No sessions match this ${range}`}
    </p>
  );
}
