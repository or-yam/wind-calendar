import { getLocationName } from "@/i18n/locations";
import { useLocale } from "@/hooks/useLocale";
import type { CSSProperties } from "react";
import type { ForecastSession } from "@shared/forecast-types";
import { windColor } from "@/lib/wind-colors";
import { waveHeightColor } from "@/lib/wave-colors";
import { cn } from "@/lib/utils";
import { DirectionIndicator } from "./DirectionIndicator";
import { sessionKey } from "./overlapLanes";
import { waveRangeLabel, windRangeLabel } from "./conditionLabels";
import { SessionBadges } from "./SessionBadges";

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
  const { t, locale } = useLocale();
  const wind = session.wind;
  const wave = session.wave;
  const midKnots = (wind.min + wind.max) / 2;
  const windLabel = windRangeLabel(wind, locale);
  const waveLabel = waveRangeLabel(wave, locale);
  const conditions = [
    session.matchType !== "wave" &&
      t("windDetails", { speed: windLabel, direction: wind.direction }),
    session.matchType !== "wind" &&
      t("waveDetails", { wave: waveLabel, direction: wave.direction }),
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
      aria-label={t("sessionLabel", {
        date: dayLabel,
        location: getLocationName(session.location.id, locale, session.location.label),
        details: `${startTime} – ${endTime}, ${conditions}`,
      })}
      className="@container/session-event session-event absolute flex flex-col items-start justify-start overflow-hidden rounded border border-border border-s-3 bg-card p-1 text-start text-card-foreground hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary aria-expanded:z-10 aria-expanded:border-primary aria-expanded:bg-muted @max-[48px]/session-event:items-center @max-[48px]/session-event:justify-center @max-[48px]/session-event:px-0"
      style={{
        ...style,
        padding: height < 48 ? 2 : undefined,
        borderTopWidth: height < 2 ? 0 : undefined,
        borderBottomWidth: height < 2 ? 0 : undefined,
        borderInlineStartColor:
          session.matchType === "wave" ? waveHeightColor(wave.avgHeight) : windColor(midKnots),
      }}
    >
      <span
        className={cn(
          "session-event__location block text-sm font-bold wrap-anywhere @max-[48px]/session-event:hidden",
          height < 48 ? "leading-none" : "leading-tight",
        )}
      >
        {getLocationName(session.location.id, locale, session.location.label)}
      </span>
      <span
        dir="ltr"
        className="session-event__time my-0.5 flex flex-wrap text-xs tabular-nums text-muted-foreground @max-[48px]/session-event:hidden"
      >
        <span className="whitespace-nowrap">{startTime}</span>
        <span className="whitespace-nowrap"> – </span>
        <span className="whitespace-nowrap">{endTime}</span>
      </span>
      <SessionBadges session={session} />
      <span className="session-event__directions mt-1 flex flex-wrap gap-1 @max-[48px]/session-event:hidden">
        {session.matchType !== "wave" && <DirectionIndicator direction={wind.direction} />}
        {session.matchType !== "wind" && <DirectionIndicator direction={wave.direction} wave />}
      </span>
    </button>
  );
}
