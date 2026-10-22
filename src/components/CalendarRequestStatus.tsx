import { useLocale } from "@/hooks/useLocale";
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
  const { t } = useLocale();
  const range = isMobile ? (mode === "day" ? "day" : "range") : "week";
  return (
    <p className="sr-only" role="status">
      {isPending
        ? t("forecastLoading")
        : error
          ? t("forecastError")
          : hasSessions
            ? ""
            : t(
                range === "day"
                  ? "noSessionsMatchDay"
                  : range === "range"
                    ? "noSessionsMatchRange"
                    : "noSessionsMatchWeek",
              )}
    </p>
  );
}
