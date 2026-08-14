import { useLayoutEffect, useRef } from "react";
import type { ForecastSession } from "@shared/forecast-types";
import { windColor, windTextColor } from "@/lib/wind-colors";
import { waveHeightColor, waveHeightTextColor } from "@/lib/wave-colors";
import { addDays, formatTimeFromDate, formatWeekRange } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WIND_ICON, WAVE_ICON } from "@shared/constants";

const DOW_FMT = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const MON_FMT = new Intl.DateTimeFormat("en-US", { month: "short" });

interface ForecastCardsProps {
  sessions: ForecastSession[];
  isPending: boolean;
  error: Error | null;
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

function formatDayLabel(date: Date): string {
  const dow = DOW_FMT.format(date).toUpperCase();
  const mon = MON_FMT.format(date);
  const day = date.getDate();
  return `${dow} ${mon} ${day}`;
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
  label: "Wind" | "Wave";
  wave?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label={`${label} direction ${direction}`}
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
    <div className="session-card flex min-h-[180px] w-60 shrink-0 snap-start flex-col p-4">
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
    track.scrollTo({
      left: today.offsetLeft - (track.clientWidth - today.clientWidth) / 2,
      behavior,
    });
  };

  useLayoutEffect(() => {
    scrollToToday(nextScrollBehaviorRef.current);
    nextScrollBehaviorRef.current = "auto";
  }, [weekStart, isPending, sessions]);

  return (
    <section className="night-section">
      <div className="content-wrap">
        <h2 className="sticker-heading">Upcoming sessions</h2>

        <nav
          aria-label="Week navigation"
          className="mb-7 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-center"
        >
          <Button variant="outline" onClick={onPrev}>
            ← Prev
          </Button>
          <span className="min-w-0 text-center text-sm font-bold tracking-wide text-foreground/80 uppercase">
            {formatWeekRange(weekStart)}
          </span>
          <Button variant="outline" onClick={onNext}>
            Next →
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
            Today
          </Button>
        </nav>

        {isPending ? (
          <div
            aria-live="polite"
            className="forecast-scroll -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3"
          >
            {Array.from({ length: 7 }, (_, i) => (
              <ForecastCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <p aria-live="polite" className="text-red-400 text-sm text-center py-8">
            {error.message}
          </p>
        ) : weekSessions.length === 0 ? (
          <p aria-live="polite" className="text-foreground/80 text-sm text-center py-8">
            No sessions match your filters this week
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
                    aria-label={`${formatDayLabel(day)}: No sessions`}
                    className={`session-card flex min-h-[180px] w-60 shrink-0 snap-start flex-col items-center justify-center p-4 opacity-60${isToday ? " bg-primary/15 ring-2 ring-primary" : ""}`}
                  >
                    <p className="mb-2 text-xs font-bold tracking-[0.08em] text-card-foreground uppercase">
                      {formatDayLabel(day)}
                    </p>
                    <p className="text-3xl text-card-foreground/70">―</p>
                    <p className="text-sm text-card-foreground/60">No match</p>
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
                    ? `${session.wind.min} kn`
                    : `${session.wind.min}–${session.wind.max} kn`;
                const waveLabel = `${session.wave.avgHeight.toFixed(1)}m${session.wave.avgPeriod > 0 ? ` ${session.wave.avgPeriod}s` : ""}`;

                const start = new Date(session.start);
                const end = new Date(session.end);
                const timeRange = `${formatTimeFromDate(start)} – ${formatTimeFromDate(end)}`;

                return (
                  <div
                    data-today={isToday}
                    tabIndex={isToday ? -1 : undefined}
                    key={`${dayKey}-${session.start}`}
                    aria-label={`${formatDayLabel(start)} at ${session.location.label}: ${timeRange}, ${session.matchType === "wind" ? `Wind ${windSpeedLabel} ${session.wind.direction}` : session.matchType === "wave" ? `Wave ${waveLabel} ${session.wave.direction}` : `Wind ${windSpeedLabel} ${session.wind.direction}, Wave ${waveLabel} ${session.wave.direction}`}`}
                    className={`session-card min-h-[180px] w-60 shrink-0 snap-start p-4 text-card-foreground${isToday ? " bg-primary/15 ring-2 ring-primary" : ""}`}
                    style={{ borderColor }}
                  >
                    <p className="mb-1 text-xs font-bold tracking-[0.08em] text-card-foreground uppercase">
                      {formatDayLabel(start)}
                    </p>
                    <p className="truncate text-sm text-card-foreground/70">
                      {session.location.label}
                    </p>
                    <div className="mt-3 mb-1 flex items-center gap-1.5">
                      {session.matchType !== "wave" ? (
                        <DirectionIndicator direction={session.wind.direction} label="Wind" />
                      ) : null}
                      {session.matchType !== "wind" ? (
                        <DirectionIndicator direction={session.wave.direction} label="Wave" wave />
                      ) : null}
                    </div>
                    <p className="text-xl font-bold text-card-foreground">{timeRange}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {session.matchType !== "wind" ? (
                        <span
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
