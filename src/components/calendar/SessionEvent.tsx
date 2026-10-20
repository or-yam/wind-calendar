import type { CSSProperties } from "react";
import type { ForecastSession } from "@shared/forecast-types";
import { windColor, windTextColor } from "@/lib/wind-colors";
import { waveHeightColor, waveHeightTextColor } from "@/lib/wave-colors";
import { cn } from "@/lib/utils";
import { DirectionIndicator } from "./DirectionIndicator";
import { sessionKey } from "./overlapLanes";
import { waveRangeLabel, windRangeLabel } from "./conditionLabels";

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
  const windLabel = windRangeLabel(wind);
  const waveLabel = waveRangeLabel(wave);
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
      data-session-key={sessionKey(session)}
      aria-expanded={expanded}
      aria-controls={expanded ? detailsId : undefined}
      onClick={(event) => onActivate(event.currentTarget)}
      aria-label={`${dayLabel} at ${session.location.label}: ${startTime} – ${endTime}, ${conditions}`}
      className="@container/session-event session-event absolute flex flex-col items-start justify-start overflow-hidden rounded border border-border border-l-3 bg-card p-1 text-left text-card-foreground hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary aria-expanded:z-10 aria-expanded:border-primary aria-expanded:bg-muted @max-[48px]/session-event:items-center @max-[48px]/session-event:justify-center @max-[48px]/session-event:px-0"
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
          "session-event__location block text-sm font-bold wrap-anywhere @max-[48px]/session-event:hidden",
          height < 48 ? "leading-none" : "leading-tight",
        )}
      >
        {session.location.label}
      </span>
      <span className="session-event__time my-0.5 flex flex-wrap text-xs tabular-nums text-muted-foreground @max-[48px]/session-event:hidden">
        <span className="whitespace-nowrap">{startTime}</span>
        <span className="whitespace-nowrap"> – </span>
        <span className="whitespace-nowrap">{endTime}</span>
      </span>
      <span className="session-event__badges flex flex-wrap gap-1 @max-[48px]/session-event:max-w-full @max-[48px]/session-event:flex-col @max-[48px]/session-event:items-center @max-[48px]/session-event:gap-0">
        {session.matchType !== "wave" && (
          <span
            className="session-event__badge session-event__wind rounded px-1 text-xs font-bold whitespace-nowrap @max-[48px]/session-event:max-w-full @max-[48px]/session-event:overflow-hidden @max-[48px]/session-event:px-px @max-[48px]/session-event:text-[8px] @max-[48px]/session-event:leading-none"
            data-compact-label="W"
            style={{ backgroundColor: windColor(midKnots), color: windTextColor(midKnots) }}
          >
            <span
              className="session-event__badge-label @max-[48px]/session-event:text-[0px] @max-[48px]/session-event:after:content-[attr(data-compact-label)] @max-[48px]/session-event:after:text-[8px]"
              data-compact-label="W"
            >
              {windLabel}
            </span>
          </span>
        )}
        {session.matchType !== "wind" && (
          <span
            className="session-event__badge session-event__wave rounded px-1 text-xs font-bold whitespace-nowrap @max-[48px]/session-event:max-w-full @max-[48px]/session-event:overflow-hidden @max-[48px]/session-event:px-px @max-[48px]/session-event:text-[8px] @max-[48px]/session-event:leading-none"
            data-compact-label="≈"
            style={{
              backgroundColor: waveHeightColor(wave.avgHeight),
              color: waveHeightTextColor(wave.avgHeight),
            }}
          >
            <span
              className="session-event__badge-label @max-[48px]/session-event:text-[0px] @max-[48px]/session-event:after:content-[attr(data-compact-label)] @max-[48px]/session-event:after:text-[8px]"
              data-compact-label="≈"
            >
              {waveLabel}
            </span>
          </span>
        )}
      </span>
      <span className="session-event__directions mt-1 flex flex-wrap gap-1 @max-[48px]/session-event:hidden">
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
