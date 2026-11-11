import type { DaylightInterval, WindConditionRaw } from "../types/wind-conditions.js";
import type { WaveSource } from "../../shared/types.js";
import { legacyDaylightResolver } from "./daylight.js";

export type MatchReason = "wind" | "wave" | "both";

export interface FilterConfig {
  windEnabled: boolean;
  windMin: number;
  windMax: number;
  waveEnabled: boolean;
  waveSource: WaveSource;
  waveHeightMin: number;
  waveHeightMax: number;
  wavePeriodMin: number;
  sunrise: string; // Format: "HH:MM"
  sunset: string; // Format: "HH:MM"
  tz: string;
  daylight?: DaylightInterval[];
}

export interface FilterResult {
  conditions: WindConditionRaw[];
  matchReasons: Map<WindConditionRaw, MatchReason>;
  daylightByCondition: Map<WindConditionRaw, DaylightInterval>;
}

export const filterEvents = (events: WindConditionRaw[], config: FilterConfig): FilterResult => {
  const legacyDaylight = config.daylight
    ? undefined
    : legacyDaylightResolver(config.tz, config.sunrise, config.sunset);
  const now = Date.now();

  const conditions: WindConditionRaw[] = [];
  const matchReasons = new Map<WindConditionRaw, MatchReason>();
  const daylightByCondition = new Map<WindConditionRaw, DaylightInterval>();

  for (const c of events) {
    // Future only
    if (c.date.getTime() <= now) continue;

    // Daylight hours (tz-aware, exclusive end)
    const daylight = config.daylight
      ? config.daylight.find(({ sunrise, sunset }) => sunrise <= c.date && c.date < sunset)
      : legacyDaylight?.(c.date);
    if (!daylight || c.date < daylight.sunrise || c.date >= daylight.sunset) continue;

    // Wind qualification
    const passesWind =
      config.windEnabled &&
      c.windSpeed !== null &&
      c.windSpeed >= config.windMin &&
      c.windSpeed <= config.windMax;

    // Wave qualification — resolve values based on source
    const height = config.waveSource === "swell" ? c.swellHeight : c.waveHeight;
    const period = config.waveSource === "swell" ? c.swellPeriod : c.wavePeriod;

    const passesWave =
      config.waveEnabled &&
      height !== null &&
      height >= config.waveHeightMin &&
      height <= config.waveHeightMax &&
      (period ?? 0) >= config.wavePeriodMin;

    if (!passesWind && !passesWave) continue;

    const reason: MatchReason = passesWind && passesWave ? "both" : passesWind ? "wind" : "wave";

    conditions.push(c);
    matchReasons.set(c, reason);
    daylightByCondition.set(c, daylight);
  }

  return { conditions, matchReasons, daylightByCondition };
};
