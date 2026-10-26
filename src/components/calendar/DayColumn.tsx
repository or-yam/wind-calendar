import { localeMetadata, type Locale } from "@/i18n/locale";
import { useLocale } from "@/hooks/useLocale";
import type { ForecastSession } from "@shared/forecast-types";
import { addDays, sameDay } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { intersects } from "./sessionSegments";
import { DayEvents } from "./DayEvents";

export function dayLabel(day: Date, locale: Locale = "en") {
  if (locale !== "en")
    return day.toLocaleDateString(localeMetadata[locale].intl, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  return `${day.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()} ${day.toLocaleDateString("en-US", { month: "short" })} ${day.getDate()}`;
}

export function DayColumn({
  day,
  sessions,
  today,
  startHour,
  endHour,
  hourHeight,
  selectedKey,
  detailsId,
  onActivate,
}: {
  day: Date;
  sessions: ForecastSession[];
  today: Date;
  startHour: number;
  endHour: number;
  hourHeight: number;
  selectedKey: string | null;
  detailsId: string;
  onActivate: (session: ForecastSession, button: HTMLButtonElement) => void;
}) {
  const { t, locale, intl } = useLocale();
  const matches = sessions.filter((s) => intersects(s, day, addDays(day, 1)));
  const isToday = sameDay(day, today);
  return (
    <div
      role="group"
      aria-label={
        matches.length ? dayLabel(day, locale) : t("emptyDayLabel", { date: dayLabel(day, locale) })
      }
      data-today={isToday}
      tabIndex={-1}
      className={cn(
        "min-w-0 border-s border-border outline-offset-[-2px]",
        isToday && "bg-primary/5",
      )}
    >
      <div className="flex h-16 flex-col items-center justify-center border-b border-border text-xs uppercase text-muted-foreground">
        {day.toLocaleDateString(intl, { weekday: "short" })}
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-xl font-bold text-foreground",
            isToday && "bg-primary text-primary-foreground",
          )}
        >
          {day.getDate()}
        </span>
      </div>
      <div
        className="relative"
        style={{
          height: (endHour - startHour) * hourHeight,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${hourHeight - 1}px, var(--border) ${hourHeight - 1}px, var(--border) ${hourHeight}px)`,
        }}
      >
        {!matches.length && (
          <p className="absolute top-1/2 w-full text-center text-xs text-muted-foreground">
            {t("noMatch")}
          </p>
        )}
        <DayEvents
          day={day}
          dayName={dayLabel(day, locale)}
          sessions={matches}
          startHour={startHour}
          hourHeight={hourHeight}
          selectedKey={selectedKey}
          detailsId={detailsId}
          onActivate={onActivate}
        />
      </div>
    </div>
  );
}
