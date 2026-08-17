import type { WindConditionRaw } from "../types/wind-conditions.js";
import type { WaveSource, WindDirection } from "../../shared/types.js";
import { WIND_DIRECTIONS, degreesToCardinal } from "../../shared/wind-directions.js";
import { getLocalHour } from "./timezone.js";

export type MatchReason = "wind" | "wave" | "both";

export interface FilterConfig {
  windEnabled: boolean;
  windMin: number;
  windMax: number;
  windDirections: WindDirection[];
  waveEnabled: boolean;
  waveSource: WaveSource;
  waveHeightMin: number;
  waveHeightMax: number;
  wavePeriodMin: number;
  sunrise: string; // Format: "HH:MM"
  sunset: string; // Format: "HH:MM"
  tz: string;
}

export interface FilterResult {
  conditions: WindConditionRaw[];
  matchReasons: Map<WindConditionRaw, MatchReason>;
}

function parseTimeString(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours + minutes / 60;
}

export const filterEvents = (events: WindConditionRaw[], config: FilterConfig): FilterResult => {
  const sunriseHour = parseTimeString(config.sunrise);
  const sunsetHour = parseTimeString(config.sunset);
  const now = Date.now();
  const acceptedDirections = new Set(config.windDirections);
  const directionUnrestricted = acceptedDirections.size === WIND_DIRECTIONS.length;

  const conditions: WindConditionRaw[] = [];
  const matchReasons = new Map<WindConditionRaw, MatchReason>();

  for (const c of events) {
    // Future only
    if (c.date.getTime() <= now) continue;

    // Daylight hours (tz-aware, exclusive end)
    const hour = getLocalHour(c.date, config.tz);
    if (hour < sunriseHour || hour >= sunsetHour) continue;

    // Wind qualification
    const cardinalDirection = c.windDirection === null ? null : degreesToCardinal(c.windDirection);
    const passesDirection =
      directionUnrestricted ||
      (cardinalDirection !== null && acceptedDirections.has(cardinalDirection));
    const passesWind =
      config.windEnabled &&
      c.windSpeed !== null &&
      c.windSpeed >= config.windMin &&
      c.windSpeed <= config.windMax &&
      passesDirection;

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
  }

  return { conditions, matchReasons };
};
