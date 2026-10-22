import { useLocale } from "@/hooks/useLocale";
import type { ForecastSession } from "@shared/forecast-types";
import { windColor, windTextColor } from "@/lib/wind-colors";
import { waveHeightColor, waveHeightTextColor } from "@/lib/wave-colors";
import { waveRangeLabel, windRangeLabel } from "./conditionLabels";

export function SessionBadges({ session }: { session: ForecastSession }) {
  const { t, locale } = useLocale();
  const midKnots = (session.wind.min + session.wind.max) / 2;
  const compact =
    "@max-[48px]/session-event:max-w-full @max-[48px]/session-event:overflow-hidden @max-[48px]/session-event:px-px @max-[48px]/session-event:text-[8px] @max-[48px]/session-event:leading-none";
  const label =
    "@max-[48px]/session-event:text-[0px] @max-[48px]/session-event:after:content-[attr(data-compact-label)] @max-[48px]/session-event:after:text-[8px]";
  return (
    <span className="session-event__badges flex flex-wrap gap-1 @max-[48px]/session-event:max-w-full @max-[48px]/session-event:flex-col @max-[48px]/session-event:items-center @max-[48px]/session-event:gap-0">
      {session.matchType !== "wave" && (
        <span
          dir="ltr"
          className={`session-event__badge session-event__wind rounded px-1 text-xs font-bold whitespace-nowrap ${compact}`}
          style={{ backgroundColor: windColor(midKnots), color: windTextColor(midKnots) }}
        >
          <span
            className={`session-event__badge-label ${label}`}
            data-compact-label={t("windCompact")}
          >
            {windRangeLabel(session.wind, locale)}
          </span>
        </span>
      )}
      {session.matchType !== "wind" && (
        <span
          dir="ltr"
          className={`session-event__badge session-event__wave rounded px-1 text-xs font-bold whitespace-nowrap ${compact}`}
          style={{
            backgroundColor: waveHeightColor(session.wave.avgHeight),
            color: waveHeightTextColor(session.wave.avgHeight),
          }}
        >
          <span className={`session-event__badge-label ${label}`} data-compact-label="≈">
            {waveRangeLabel(session.wave, locale)}
          </span>
        </span>
      )}
    </span>
  );
}
