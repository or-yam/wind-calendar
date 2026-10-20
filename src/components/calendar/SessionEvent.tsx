import type { CSSProperties } from "react";
import type { ForecastSession } from "@shared/forecast-types";
import { windColor, windTextColor } from "@/lib/wind-colors";
import { waveHeightColor, waveHeightTextColor } from "@/lib/wave-colors";
import { cn } from "@/lib/utils";
import { DirectionIndicator } from "./DirectionIndicator";

export function SessionEvent({
  session,
  dayLabel,
  style,
  startTime,
  endTime,
  expanded,
  detailsId,
  onActivate,
}: {
  session: ForecastSession;
  dayLabel: string;
  style: CSSProperties;
  startTime: string;
  endTime: string;
  expanded: boolean;
  detailsId: string;
  onActivate: (button: HTMLButtonElement) => void;
}) {
  const wind = session.wind;
  const wave = session.wave;
  const midKnots = (wind.min + wind.max) / 2;
  const windLabel = wind.min === wind.max ? `${wind.min} kn` : `${wind.min}–${wind.max} kn`;
  const waveLabel = `${wave.avgHeight.toFixed(1)}m${wave.avgPeriod > 0 ? ` ${wave.avgPeriod}s` : ""}`;
  const conditions = [
    session.matchType !== "wave" && `Wind ${windLabel} ${wind.direction}`,
    session.matchType !== "wind" && `Wave ${waveLabel} ${wave.direction}`,
  ]
    .filter(Boolean)
    .join(", ");
  const height = Number(style.height);

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={expanded ? detailsId : undefined}
      onClick={(event) => onActivate(event.currentTarget)}
      aria-label={`${dayLabel} at ${session.location.label}: ${startTime} – ${endTime}, ${conditions}`}
      className="absolute flex flex-col items-start justify-start overflow-hidden rounded border border-border border-l-3 bg-card p-1 text-left text-card-foreground hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary aria-expanded:z-10 aria-expanded:border-primary aria-expanded:bg-muted"
      style={{
        ...style,
        padding: height < 48 ? 2 : undefined,
        borderTopWidth: height < 2 ? 0 : undefined,
        borderBottomWidth: height < 2 ? 0 : undefined,
        borderLeftColor:
          session.matchType === "wave" ? waveHeightColor(wave.avgHeight) : windColor(midKnots),
      }}
    >
      <span
        className={cn(
          "block text-sm font-bold wrap-anywhere",
          height < 48 ? "leading-none" : "leading-tight",
        )}
      >
        {session.location.label}
      </span>
      <span className="my-0.5 flex flex-wrap text-xs tabular-nums text-muted-foreground">
        <span className="whitespace-nowrap">{startTime}</span>
        <span className="whitespace-nowrap"> – </span>
        <span className="whitespace-nowrap">{endTime}</span>
      </span>
      <span className="flex flex-wrap gap-1">
        {session.matchType !== "wave" && (
          <span
            className="rounded px-1 text-xs font-bold whitespace-nowrap"
            style={{ backgroundColor: windColor(midKnots), color: windTextColor(midKnots) }}
          >
            {windLabel}
          </span>
        )}
        {session.matchType !== "wind" && (
          <span
            className="rounded px-1 text-xs font-bold whitespace-nowrap"
            style={{
              backgroundColor: waveHeightColor(wave.avgHeight),
              color: waveHeightTextColor(wave.avgHeight),
            }}
          >
            {waveLabel}
          </span>
        )}
      </span>
      <span className="mt-1 flex flex-wrap gap-1">
        {session.matchType !== "wave" && (
          <DirectionIndicator direction={wind.direction} label="Wind" />
        )}
        {session.matchType !== "wind" && (
          <DirectionIndicator direction={wave.direction} label="Wave" wave />
        )}
      </span>
    </button>
  );
}
