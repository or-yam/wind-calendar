import { getLocationName } from "@/i18n/locations";
import { formatNumber } from "@/lib/date-utils";
import { useLocale } from "@/hooks/useLocale";
import { useLayoutEffect, useRef } from "react";
import type { ForecastSession } from "@shared/forecast-types";
import { SessionTimeRange } from "./SessionTimeRange";
import { DirectionIndicator } from "./DirectionIndicator";
import { waveRangeLabel, windRangeLabel } from "./conditionLabels";

export function SessionDetails({
  session,
  id,
  onClose,
}: {
  session: ForecastSession;
  id: string;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current?.focus();
  }, [session.location.id, session.start, session.end, session.matchType]);
  const { wind, wave, swell } = session;
  return (
    <div
      ref={ref}
      id={id}
      role="region"
      aria-label={t("sessionDetails")}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      className="relative mt-3 rounded border border-border border-s-3 border-s-primary bg-card p-4 pe-14 text-sm text-card-foreground focus-visible:outline-2 focus-visible:outline-primary"
    >
      <h3 className="text-lg font-bold">
        {getLocationName(session.location.id, locale, session.location.label)}
      </h3>
      <p className="text-muted-foreground">
        <SessionTimeRange start={session.start} end={session.end} />
      </p>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {session.matchType !== "wave" && (
          <p>
            {t("wind")} <bdi dir="ltr">{windRangeLabel(wind, locale)}</bdi> · {t("gusts")}{" "}
            <bdi dir="ltr">
              {formatNumber(wind.gustMax, locale)} {t("unitKnots")}
            </bdi>{" "}
            <DirectionIndicator direction={wind.direction} />
          </p>
        )}
        {session.matchType !== "wind" && (
          <>
            <p>
              {t("wave")} <bdi dir="ltr">{waveRangeLabel(wave, locale)}</bdi>{" "}
              <DirectionIndicator direction={wave.direction} wave />
            </p>
            <p>
              {t("swell")} <bdi dir="ltr">{waveRangeLabel(swell, locale)}</bdi>
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        aria-label={t("closeSessionDetails")}
        onClick={onClose}
        className="absolute top-1 end-1 flex size-11 items-center justify-center rounded text-xl focus-visible:outline-2 focus-visible:outline-primary"
      >
        ×
      </button>
    </div>
  );
}
