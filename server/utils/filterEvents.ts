import type { WindConditionRaw } from "../types/wind-conditions";
import { getLocalHour } from "./timezone";

export interface FilterConfig {
  windMin: number;
  windMax: number;
  sunrise: string; // Format: "HH:MM"
  sunset: string; // Format: "HH:MM"
  tz: string;
  waveHeightMin?: number;
}

function parseTimeString(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours + minutes / 60;
}

export const filterEvents = (
  events: WindConditionRaw[],
  config: FilterConfig,
): WindConditionRaw[] => {
  const sunriseHour = parseTimeString(config.sunrise);
  const sunsetHour = parseTimeString(config.sunset);
  const now = Date.now();

  return events.filter((c) => {
    // Null windSpeed -> out
    if (c.windSpeed === null) return false;

    // Wind speed bounds
    if (c.windSpeed < config.windMin || c.windSpeed > config.windMax) return false;

    // Gusts are NOT filtered by windMax

    // Future only
    if (c.date.getTime() <= now) return false;

    // Daylight hours (tz-aware, exclusive end)
    const hour = getLocalHour(c.date, config.tz);
    if (hour < sunriseHour || hour >= sunsetHour) return false;

    // Wave height minimum (skip check if waveHeight is null/unavailable)
    if (
      config.waveHeightMin != null &&
      c.waveHeight !== null &&
      c.waveHeight < config.waveHeightMin
    )
      return false;

    return true;
  });
};
