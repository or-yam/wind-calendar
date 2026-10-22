import { formatNumber } from "@/lib/date-utils";
import type { Locale } from "@/i18n/locale";
import type { ForecastSession } from "@shared/forecast-types";

export const windRangeLabel = ({ min, max }: ForecastSession["wind"], locale: Locale = "en") =>
  min === max
    ? `${formatNumber(min, locale)} kn`
    : `${formatNumber(min, locale)}–${formatNumber(max, locale)} kn`;

export const waveRangeLabel = (
  { avgHeight, avgPeriod }: Pick<ForecastSession["wave"], "avgHeight" | "avgPeriod">,
  locale: Locale = "en",
) =>
  `${formatNumber(avgHeight, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m${avgPeriod > 0 ? ` ${formatNumber(avgPeriod, locale)}s` : ""}`;
