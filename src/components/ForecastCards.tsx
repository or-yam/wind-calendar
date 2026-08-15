import { useLayoutEffect, useRef } from "react";
import type { ForecastSession } from "@shared/forecast-types";
import { windColor, windTextColor } from "@/lib/wind-colors";
import { waveHeightColor, waveHeightTextColor } from "@/lib/wave-colors";
import { addDays, formatTimeFromDate, formatWeekRange } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WIND_ICON, WAVE_ICON } from "@shared/constants";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { localeMetadata, type Locale } from "@/i18n/locale";
import { getLocationName } from "@/i18n/locations";
import { formatNumber } from "@/lib/date-utils";

const isolate = (value: string) => `\u2068${value}\u2069`;

interface ForecastCardsProps {
  sessions: ForecastSession[];
  isPending: boolean;
  error: Error | null;
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

function formatDayLabel(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeMetadata[locale].intl, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

interface DayGroup {
  key: string;
  date: Date;
  sessions: ForecastSession[];
}

const DIRECTION_ROTATION: Record<string, number> = {
  W: 0,
  NW: 45,
  N: 90,
  NE: 135,
  E: 180,
  SE: 225,
  S: 270,
  SW: 315,
};

function DirectionIndicator({
  direction,
  label,
  wave = false,
}: {
  direction: string;
  label: string;
  wave?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      dir="ltr"
      className="inline-flex items-center gap-0.5 text-sm leading-none text-card-foreground"
    >
      {wave ? <span aria-hidden="true">{WAVE_ICON}</span> : null}
      <span
        aria-hidden="true"
        className="inline-block"
        style={{ transform: `rotate(${DIRECTION_ROTATION[direction] ?? 0}deg)` }}
      >
        {WIND_ICON}
      </span>
      <span aria-hidden="true">-{direction}</span>
    </span>
  );
}

function groupByDay(sessions: ForecastSession[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const session of sessions) {
    const date = new Date(session.start);
    const key = date.toDateString();
    if (!map.has(key)) {
      map.set(key, { key, date, sessions: [] });
    }
    map.get(key)!.sessions.push(session);
  }
  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function ForecastCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="session-card flex min-h-[180px] w-60 shrink-0 snap-start flex-col p-4"
    >
      <Skeleton className="mb-3 h-3 w-16" />
      <Skeleton className="mb-2 h-6 w-24" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-auto h-5 w-16" />
    </div>
  );
}

export function ForecastCards({
  sessions,
  isPending,
  error,
  weekStart,
  onPrev,
  onNext,
  onToday,
}: ForecastCardsProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const number = (value: number, digits = 1) =>
    formatNumber(value, locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  const trackRef = useRef<HTMLDivElement>(null);
  const nextScrollBehaviorRef = useRef<ScrollBehavior>("auto");
  const weekSessions = sessions.filter(
    (s) => new Date(s.start) >= weekStart && new Date(s.start) < addDays(weekStart, 7),
  );
  const groups = groupByDay(weekSessions);

  const scrollToToday = (behavior: ScrollBehavior, focus = false) => {
    const track = trackRef.current;
    const today = track?.querySelector<HTMLElement>("[data-today='true']");
    if (!track || !today) return;
    if (focus) today.focus({ preventScroll: true });
    const pagePosition = { x: window.scrollX, y: window.scrollY };
    today.scrollIntoView({
      behavior,
      block: "nearest",
      inline: "center",
      container: "nearest",
    } as ScrollIntoViewOptions & { container: "nearest" });
    if (window.scrollX !== pagePosition.x || window.scrollY !== pagePosition.y) {
      window.scrollTo(pagePosition.x, pagePosition.y);
    }
  };

  useLayoutEffect(() => {
    scrollToToday(nextScrollBehaviorRef.current);
    nextScrollBehaviorRef.current = "auto";
  }, [weekStart, isPending, sessions]);

  return (
    <section className="night-section">
      <div className="content-wrap">
        <h2 className="sticker-heading">{t("upcomingSessions")}</h2>

        <nav
          aria-label={t("weekNavigation")}
          className="mb-7 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-center"
        >
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
            {t("previous")}
          </Button>
          <span className="min-w-0 text-center text-sm font-bold tracking-wide text-foreground/80 uppercase">
            <bdi>{formatWeekRange(weekStart, locale)}</bdi>
          </span>
          <Button variant="outline" onClick={onNext}>
            {t("next")}
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              nextScrollBehaviorRef.current = "smooth";
              onToday();
              scrollToToday("smooth", true);
            }}
            className="col-span-3 justify-self-center"
          >
            {t("today")}
          </Button>
        </nav>

        {isPending ? (
          <div
            role="status"
            aria-live="polite"
            className="forecast-scroll -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3"
          >
            <span className="sr-only">{t("forecastLoading")}</span>
            {Array.from({ length: 7 }, (_, i) => (
              <ForecastCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <p aria-live="polite" className="text-red-400 text-sm text-center py-8">
            {t("forecastError")}
          </p>
        ) : weekSessions.length === 0 ? (
          <p aria-live="polite" className="text-foreground/80 text-sm text-center py-8">
            {t("noSessionsWeek")}
          </p>
        ) : (
          <div
            ref={trackRef}
            aria-live="polite"
            className="forecast-scroll -mx-4 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 pb-3"
          >
            {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((day) => {
              const dayKey = day.toDateString();
              const dayGroup = groups.find((g) => g.key === dayKey);
              const isToday = day.toDateString() === new Date().toDateString();

              if (!dayGroup) {
                return (
                  <div
                    data-today={isToday}
                    tabIndex={isToday ? -1 : undefined}
                    key={dayKey}
                    aria-label={`${formatDayLabel(day, locale)}: ${t("noSessions")}`}
                    className={`session-card flex min-h-[180px] w-60 shrink-0 snap-start flex-col items-center justify-center p-4 opacity-60${isToday ? " bg-primary/15 ring-2 ring-primary" : ""}`}
                  >
                    <p className="mb-2 text-xs font-bold tracking-[0.08em] text-card-foreground uppercase">
                      {formatDayLabel(day, locale)}
                    </p>
                    <p className="text-3xl text-card-foreground/70">―</p>
                    <p className="text-sm text-card-foreground/60">{t("noMatch")}</p>
                  </div>
                );
              }

              return dayGroup.sessions.map((session) => {
                const midKnots = (session.wind.min + session.wind.max) / 2;
                const borderColor =
                  session.matchType === "wave"
                    ? waveHeightColor(session.wave.avgHeight)
                    : windColor(midKnots);

                const windSpeedLabel =
                  session.wind.min === session.wind.max
                    ? `${number(session.wind.min)} ${t("unitKnots")}`
                    : `${number(session.wind.min)}–${number(session.wind.max)} ${t("unitKnots")}`;
                const waveLabel = `${number(session.wave.avgHeight)}${t("unitMeters")}${session.wave.avgPeriod > 0 ? ` ${number(session.wave.avgPeriod)}${t("unitSeconds")}` : ""}`;

                const start = new Date(session.start);
                const end = new Date(session.end);
                const timeRange = `${formatTimeFromDate(start, locale)} – ${formatTimeFromDate(end, locale)}`;
                const locationName = getLocationName(
                  session.location.id,
                  locale,
                  session.location.label,
                );
                const details =
                  session.matchType === "wind"
                    ? t("windDetails", {
                        speed: isolate(windSpeedLabel),
                        direction: isolate(session.wind.direction),
                      })
                    : session.matchType === "wave"
                      ? t("waveDetails", {
                          wave: isolate(waveLabel),
                          direction: isolate(session.wave.direction),
                        })
                      : t("bothDetails", {
                          speed: isolate(windSpeedLabel),
                          windDirection: isolate(session.wind.direction),
                          wave: isolate(waveLabel),
                          waveDirection: isolate(session.wave.direction),
                        });

                return (
                  <div
                    data-today={isToday}
                    tabIndex={isToday ? -1 : undefined}
                    key={`${dayKey}-${session.start}`}
                    aria-label={t("sessionLabel", {
                      date: formatDayLabel(start, locale),
                      location: locationName,
                      details: `${isolate(timeRange)}, ${details}`,
                    })}
                    className={`session-card min-h-[180px] w-60 shrink-0 snap-start p-4 text-card-foreground${isToday ? " bg-primary/15 ring-2 ring-primary" : ""}`}
                    style={{ borderColor }}
                  >
                    <p className="mb-1 text-xs font-bold tracking-[0.08em] text-card-foreground uppercase">
                      {formatDayLabel(start, locale)}
                    </p>
                    <p className="truncate text-sm text-card-foreground/70">{locationName}</p>
                    <div className="mt-3 mb-1 flex items-center gap-1.5">
                      {session.matchType !== "wave" ? (
                        <DirectionIndicator
                          direction={session.wind.direction}
                          label={t("windDirection", {
                            direction: isolate(session.wind.direction),
                          })}
                        />
                      ) : null}
                      {session.matchType !== "wind" ? (
                        <DirectionIndicator
                          direction={session.wave.direction}
                          label={t("waveDirection", {
                            direction: isolate(session.wave.direction),
                          })}
                          wave
                        />
                      ) : null}
                    </div>
                    <p dir="ltr" className="text-xl font-bold text-card-foreground">
                      {timeRange}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {session.matchType !== "wind" ? (
                        <span
                          dir="ltr"
                          className="inline-block rounded px-2 py-0.5 text-xs font-bold tabular-nums"
                          style={{
                            backgroundColor: waveHeightColor(session.wave.avgHeight),
                            color: waveHeightTextColor(session.wave.avgHeight),
                          }}
                        >
                          {waveLabel}
                        </span>
                      ) : null}
                      {session.matchType !== "wave" ? (
                        <span
                          dir="ltr"
                          className="inline-block rounded px-2 py-0.5 text-xs font-bold tabular-nums"
                          style={{
                            backgroundColor: windColor(midKnots),
                            color: windTextColor(midKnots),
                          }}
                        >
                          {windSpeedLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              });
            })}
          </div>
        )}
      </div>
    </section>
  );
}
