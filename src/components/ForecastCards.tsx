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
    <div className="bg-[#0D1525] border border-[#1F2937] rounded-lg p-2 min-w-[120px] shrink-0 border-l-4 border-l-slate-700 aspect-[3/2] flex flex-col snap-center">
      <Skeleton className="h-3 w-16 mb-1" />
      <Skeleton className="h-4 w-6 mb-1" />
      <Skeleton className="h-3 w-20 mb-1" />
      <Skeleton className="h-4 w-12 mt-auto" />
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
  const weekSessions = sessions.filter(
    (s) => new Date(s.start) >= weekStart && new Date(s.start) < addDays(weekStart, 7),
  );
  const groups = groupByDay(weekSessions);

  return (
    <section className="py-12 px-5 bg-[#0B1220]">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-slate-200 mb-6">Upcoming Sessions</h2>

        <nav aria-label="Week navigation" className="flex gap-2 mb-2 justify-center items-center">
          <Button variant="ghost" onClick={onPrev}>
            ← Prev
          </Button>
          <span className="text-sm text-slate-300 font-medium min-w-[140px] text-center">
            {formatWeekRange(weekStart)}
          </span>
          <Button variant="ghost" onClick={onNext}>
            Next →
          </Button>
        </nav>
        <div className="flex gap-2 mb-6 justify-center">
          <Button variant="ghost" onClick={onToday}>
            Today
          </Button>
        </div>

        {isPending ? (
          <div
            aria-live="polite"
            className="flex flex-row gap-2 overflow-x-auto snap-x snap-mandatory -mx-5 px-5 sm:overflow-x-visible sm:snap-x-none sm:-mx-0 sm:px-0 forecast-scroll"
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
          <p aria-live="polite" className="text-slate-300 text-sm text-center py-8">
            No sessions match your filters this week
          </p>
        ) : (
          <div
            aria-live="polite"
            className="flex flex-row gap-2 overflow-x-auto snap-x snap-mandatory -mx-5 px-5 sm:overflow-x-visible sm:snap-x-none sm:-mx-0 sm:px-0 forecast-scroll"
          >
            {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((day) => {
              const dayKey = day.toDateString();
              const dayGroup = groups.find((g) => g.key === dayKey);

              if (!dayGroup) {
                return (
                  <div
                    key={dayKey}
                    aria-label={`${formatDayLabel(day)}: No sessions`}
                    className="bg-[#0D1525] border border-[#1F2937] rounded-lg p-2 min-w-[120px] shrink-0 opacity-60 border-l-4 aspect-[3/2] flex flex-col items-center justify-center snap-center"
                    style={{ borderLeftColor: "#FFFFFF" }}
                  >
                    <p className="text-[10px] font-semibold text-slate-300 uppercase mb-1">
                      {formatDayLabel(day)}
                    </p>
                    <p className="text-2xl text-slate-400">―</p>
                  </div>
                );
              }

              return dayGroup.sessions.map((session) => {
                const midKnots = (session.wind.min + session.wind.max) / 2;
                const borderColor =
                  session.matchType === "wave"
                    ? waveHeightColor(session.wave.avgHeight)
                    : windColor(midKnots);

                const windLabel =
                  session.wind.min === session.wind.max
                    ? `${session.wind.min} kn`
                    : `${session.wind.min}–${session.wind.max} kn`;

                const icon =
                  session.matchType === "both"
                    ? `${WIND_ICON}${WAVE_ICON}`
                    : session.matchType === "wave"
                      ? WAVE_ICON
                      : WIND_ICON;

                const start = new Date(session.start);
                const end = new Date(session.end);
                const timeRange = `${formatTimeFromDate(start)} – ${formatTimeFromDate(end)}`;

                return (
                  <div
                    key={`${dayKey}-${session.start}`}
                    aria-label={`${formatDayLabel(start)}: ${timeRange}, ${session.matchType === "wind" ? `Wind ${windLabel}` : session.matchType === "wave" ? `Wave ${session.wave.avgHeight.toFixed(1)}m` : `Wind ${windLabel}, Wave ${session.wave.avgHeight.toFixed(1)}m`}`}
                    className="bg-[#111827] border border-[#1F2937] rounded-lg p-2 min-w-[120px] shrink-0 border-l-4 aspect-[3/2] snap-center"
                    style={{ borderLeftColor: borderColor }}
                  >
                    <p className="text-[10px] font-semibold text-slate-300 uppercase mb-0.5">
                      {formatDayLabel(start)}
                    </p>
                    <p className="text-sm leading-none mb-1" style={{ color: borderColor }}>
                      {icon}
                    </p>
                    <p className="text-xs font-medium text-slate-200">{timeRange}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {session.matchType !== "wind" ? (
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums"
                          style={{
                            backgroundColor: waveHeightColor(session.wave.avgHeight),
                            color: waveHeightTextColor(session.wave.avgHeight),
                          }}
                        >
                          {session.wave.avgHeight.toFixed(1)}m
                          {session.wave.avgPeriod > 0 ? ` ${session.wave.avgPeriod}s` : ""}
                        </span>
                      ) : null}
                      {session.matchType !== "wave" ? (
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums"
                          style={{
                            backgroundColor: windColor(midKnots),
                            color: windTextColor(midKnots),
                          }}
                        >
                          {windLabel}
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
