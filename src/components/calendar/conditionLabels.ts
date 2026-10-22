import type { ForecastSession } from "@shared/forecast-types";

export const windRangeLabel = ({ min, max }: ForecastSession["wind"]) =>
  min === max ? `${min} kn` : `${min}–${max} kn`;

export const waveRangeLabel = ({
  avgHeight,
  avgPeriod,
}: Pick<ForecastSession["wave"], "avgHeight" | "avgPeriod">) =>
  `${avgHeight.toFixed(1)}m${avgPeriod > 0 ? ` ${avgPeriod}s` : ""}`;
