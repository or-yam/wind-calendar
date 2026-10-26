import { useLocale } from "@/hooks/useLocale";
import { formatTimeFromDate, sameDay } from "@/lib/date-utils";

export function SessionTimeRange({ start, end }: { start: string; end: string }) {
  const { locale, intl } = useLocale();
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dateLabel = (date: Date) =>
    date.toLocaleDateString(intl, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return (
    <>
      <bdi>{dateLabel(startDate)}</bdi>,{" "}
      {sameDay(startDate, endDate) ? (
        <bdi dir="ltr">
          {formatTimeFromDate(startDate, locale)} – {formatTimeFromDate(endDate, locale)}
        </bdi>
      ) : (
        <>
          <bdi dir="ltr">{formatTimeFromDate(startDate, locale)}</bdi> –{" "}
          <bdi>{dateLabel(endDate)}</bdi>,{" "}
          <bdi dir="ltr">{formatTimeFromDate(endDate, locale)}</bdi>
        </>
      )}
    </>
  );
}
