import type { IcsEvent } from "@/lib/ics-parser";
import { windColor } from "@/lib/wind-colors";
import { addDays } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";

interface ForecastCardsProps {
  events: IcsEvent[];
  loading: boolean;
  error: string | null;
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatDayLabel(date: Date): string {
  const dow = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const mon = date.toLocaleDateString("en-US", { month: "short" });
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
  const match = summary.match(/(\d+)\s*[–-]\s*(\d+)\s*kn/i);
  if (!match) return null;
  const lo = parseInt(match[1], 10);
  const hi = parseInt(match[2], 10);
  return { lo, hi, mid: (lo + hi) / 2 };
}

function windTextColor(knots: number): string {
  return knots <= 20 ? "#0B1220" : "#E5E7EB";
}

function parseWaveHeight(summary: string): string | null {
  const match = summary.match(/\|\s*([\d.]+)m\s*waves/i);
  return match ? `${match[1]}m` : null;
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

              return dayGroup.events.map((event, idx) => {
                const wind = parseWindKnots(event.summary);
                const midKnots = wind ? wind.mid : 15;
                const borderColor = windColor(midKnots);
                const start = event.dtstart.date;
                const end = event.dtend?.date ?? null;
                const timeRange = end
                  ? `${formatTime(start)} – ${formatTime(end)}`
                  : formatTime(start);
                const windLabel = wind ? `${wind.lo}–${wind.hi} kn` : null;
                const waveLabel = parseWaveHeight(event.summary);

                return (
                  <div
                    key={`${dayKey}-${idx}`}
                    className="bg-[#111827] border border-[#1F2937] rounded-lg p-2 flex-1 min-w-0 border-l-4 aspect-[3/2]"
                    style={{ borderLeftColor: borderColor }}
                  >
                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">
                      {formatDayLabel(start)}
                    </p>
                    <p className="text-xs font-medium text-slate-200">{timeRange}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {windLabel && (
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: windColor(midKnots),
                            color: windTextColor(midKnots),
                          }}
                        >
                          {windLabel}
                        </span>
                      )}
                      {waveLabel && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                          {waveLabel}
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
