import type { CSSProperties } from "react";
import type { ForecastSession } from "@shared/forecast-types";
import { windColor, windTextColor } from "@/lib/wind-colors";
import { waveHeightColor, waveHeightTextColor } from "@/lib/wave-colors";
import { formatTimeFromDate } from "@/lib/date-utils";
import { DirectionIndicator } from "./DirectionIndicator";

export function SessionEvent({
  session,
  dayLabel,
  style,
}: {
  session: ForecastSession;
  dayLabel: string;
  style: CSSProperties;
}) {
  const wind = session.wind;
  const wave = session.wave;
  const midKnots = (wind.min + wind.max) / 2;
  const windLabel = wind.min === wind.max ? `${wind.min} kn` : `${wind.min}–${wind.max} kn`;
  const waveLabel = `${wave.avgHeight.toFixed(1)}m${wave.avgPeriod > 0 ? ` ${wave.avgPeriod}s` : ""}`;
  const time = `${formatTimeFromDate(new Date(session.start))} – ${formatTimeFromDate(new Date(session.end))}`;
  const conditions = [
    session.matchType !== "wave" && `Wind ${windLabel} ${wind.direction}`,
    session.matchType !== "wind" && `Wave ${waveLabel} ${wave.direction}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      role="group"
      aria-label={`${dayLabel} at ${session.location.label}: ${time}, ${conditions}`}
      className="absolute inset-x-1 overflow-hidden rounded border border-border border-l-3 bg-card p-1.5 text-card-foreground"
      style={{
        ...style,
        borderLeftColor:
          session.matchType === "wave" ? waveHeightColor(wave.avgHeight) : windColor(midKnots),
      }}
    >
      <p className="text-sm font-bold leading-tight wrap-anywhere">{session.location.label}</p>
      <p className="my-1 text-xs tabular-nums text-muted-foreground">{time}</p>
      <div className="flex flex-wrap gap-1">
        {session.matchType !== "wave" && (
          <span
            className="rounded px-1 text-xs font-bold"
            style={{ backgroundColor: windColor(midKnots), color: windTextColor(midKnots) }}
          >
            {windLabel}
          </span>
        )}
        {session.matchType !== "wind" && (
          <span
            className="rounded px-1 text-xs font-bold"
            style={{
              backgroundColor: waveHeightColor(wave.avgHeight),
              color: waveHeightTextColor(wave.avgHeight),
            }}
          >
            {waveLabel}
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {session.matchType !== "wave" && (
          <DirectionIndicator direction={wind.direction} label="Wind" />
        )}
        {session.matchType !== "wind" && (
          <DirectionIndicator direction={wave.direction} label="Wave" wave />
        )}
      </div>
    </div>
  );
}
