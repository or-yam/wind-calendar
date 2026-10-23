import { formatNumber } from "@/lib/date-utils";
import i18n from "@/i18n";
import type { Locale } from "@/i18n/locale";
import type { ForecastSession } from "@shared/forecast-types";

export const windRangeLabel = ({ min, max }: ForecastSession["wind"], locale: Locale = "en") => {
  const range =
    min === max
      ? formatNumber(min, locale)
      : `${formatNumber(min, locale)}–${formatNumber(max, locale)}`;
  return `${range} ${i18n.t("unitKnots", { lng: locale })}`;
};

export const waveRangeLabel = (
  { avgHeight, avgPeriod }: Pick<ForecastSession["wave"], "avgHeight" | "avgPeriod">,
  locale: Locale = "en",
) =>
  `${formatNumber(avgHeight, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m${avgPeriod > 0 ? ` ${formatNumber(avgPeriod, locale)}s` : ""}`;
