import type { IcsEvent } from "@/lib/ics-parser";
import { windColor } from "@/lib/wind-colors";
import { addDays, formatTimeFromDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { WIND_ICON, WAVE_ICON } from "@shared/constants";

const RANGE_RE = /(\d+)\s*[–-]\s*(\d+)\s*kn/i;
const SINGLE_RE = /(\d+)\s*kn/i;
const WAVE_RE = /\|\s*([\d.]+)m\s*(?:(\d+)s\s*)?waves/i;
const WAVE_COLOR = "#2563EB";

// Cached Intl.DateTimeFormat instances
const DOW_FMT = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const MON_FMT = new Intl.DateTimeFormat("en-US", { month: "short" });

interface ForecastCardsProps {
  events: IcsEvent[];
  loading: boolean;
  error: string | null;
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
  events: IcsEvent[];
}

function groupByDay(events: IcsEvent[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const event of events) {
    const key = event.dtstart.date.toDateString();
    if (!map.has(key)) {
      map.set(key, { key, date: event.dtstart.date, events: [] });
    }
    map.get(key)!.events.push(event);
  }
  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function parseWindKnots(summary: string): { lo: number; hi: number; mid: number } | null {
  // Match range "15-20kn" or single value "15kn"
  const rangeMatch = summary.match(RANGE_RE);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1], 10);
    const hi = parseInt(rangeMatch[2], 10);
    return { lo, hi, mid: (lo + hi) / 2 };
  }
  const singleMatch = summary.match(SINGLE_RE);
  if (singleMatch) {
    const val = parseInt(singleMatch[1], 10);
    return { lo: val, hi: val, mid: val };
  }
  return null;
}

function windTextColor(knots: number): string {
  return knots <= 20 ? "#0B1220" : "#E5E7EB";
}

function parseWaveInfo(summary: string): { height: string; period?: string } | null {
  const bothMatch = summary.match(WAVE_RE);
  if (bothMatch) {
    return { height: `${bothMatch[1]}m`, period: bothMatch[2] ? `${bothMatch[2]}s` : undefined };
  }
  return null;
}

function getEventType(summary: string): "wind" | "wave" | "both" {
  if (summary.startsWith(WIND_ICON)) {
    return summary.startsWith(`${WIND_ICON}${WAVE_ICON}`) ? "both" : "wind";
  }
  if (summary.startsWith(WAVE_ICON)) {
    return "wave";
  }
  console.warn(`Event missing icon prefix: ${summary}`);
  return "wind";
}

export function ForecastCards({
  events,
  loading,
  error,
  weekStart,
  onPrev,
  onNext,
  onToday,
}: ForecastCardsProps) {
  const weekEvents = events.filter(
    (e) => e.dtstart.date >= weekStart && e.dtstart.date < addDays(weekStart, 7),
  );
  const groups = groupByDay(weekEvents);

  return (
    <section className="py-12 px-5 bg-[#0B1220]">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-slate-200 mb-6">Upcoming Sessions</h2>

        <div className="flex gap-2 mb-6 justify-center">
          <Button variant="ghost" onClick={onPrev}>
            ← Prev
          </Button>
          <Button variant="ghost" onClick={onToday}>
            Today
          </Button>
          <Button variant="ghost" onClick={onNext}>
            Next →
          </Button>
        </div>

        {loading && (
          <div
            className="w-8 h-8 rounded-full border-2 border-[#1F2937] border-t-sky-500 animate-spin mx-auto"
            role="status"
            aria-label="Loading"
          />
        )}

        {!loading && error && <p className="text-red-400 text-sm text-center py-8">{error}</p>}

        {!loading && !error && (
          <div className="flex flex-row gap-2">
            {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((day) => {
              const dayKey = day.toDateString();
              const dayGroup = groups.find((g) => g.key === dayKey);

              if (!dayGroup) {
                return (
                  <div
                    key={dayKey}
                    className="bg-[#0D1525] border border-[#1F2937] rounded-lg p-2 flex-1 min-w-0 opacity-60 border-l-4 aspect-[3/2] flex flex-col items-center justify-center"
                    style={{ borderLeftColor: "#FFFFFF" }}
                  >
                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">
                      {formatDayLabel(day)}
                    </p>
                    <p className="text-2xl text-slate-500">―</p>
                  </div>
                );
              }

              return dayGroup.events.map((event) => {
                const eventType = getEventType(event.summary);
                const wind = parseWindKnots(event.summary);
                const midKnots = wind ? wind.mid : 15;
                const borderColor = eventType === "wave" ? WAVE_COLOR : windColor(midKnots);
                const start = event.dtstart.date;
                const end = event.dtend?.date ?? null;
                const timeRange = end
                  ? `${formatTimeFromDate(start)} – ${formatTimeFromDate(end)}`
                  : formatTimeFromDate(start);
                const windLabel = wind
                  ? wind.lo === wind.hi
                    ? `${wind.lo} kn`
                    : `${wind.lo}–${wind.hi} kn`
                  : null;
                const waveInfo = parseWaveInfo(event.summary);

                const eventIcon =
                  eventType === "both"
                    ? `${WIND_ICON}${WAVE_ICON}`
                    : eventType === "wave"
                      ? WAVE_ICON
                      : WIND_ICON;

                return (
                  <div
                    key={`${dayKey}-${event.dtstart.date.getTime()}`}
                    className="bg-[#111827] border border-[#1F2937] rounded-lg p-2 flex-1 min-w-0 border-l-4 aspect-[3/2]"
                    style={{ borderLeftColor: borderColor }}
                  >
                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">
                      {formatDayLabel(start)}
                    </p>
                    <p className="text-sm leading-none mb-1" style={{ color: borderColor }}>
                      {eventIcon}
                    </p>
                    <p className="text-xs font-medium text-slate-200">{timeRange}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {windLabel && (
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums"
                          style={{
                            backgroundColor: windColor(midKnots),
                            color: windTextColor(midKnots),
                          }}
                        >
                          {windLabel}
                        </span>
                      )}
                      {waveInfo && (
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white tabular-nums"
                          style={{ backgroundColor: WAVE_COLOR }}
                        >
                          {waveInfo.height}
                          {waveInfo.period && ` ${waveInfo.period}`}
                        </span>
                      )}
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
