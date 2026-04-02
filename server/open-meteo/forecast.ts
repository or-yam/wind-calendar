import type { WindConditionRaw } from "../types/wind-conditions";
import type { OpenMeteoForecastResponse, OpenMeteoMarineResponse } from "./types";
import { fetchForecast, fetchMarine } from "./fetch";
import { tryCatch } from "../utils/try-catch";

/**
 * Parse ISO 8601 timestamp to "HH:MM" string.
 * Example: "2026-03-03T06:15" → "06:15"
 */
function extractTime(isoTimestamp: string): string {
  const match = isoTimestamp.match(/T(\d{2}:\d{2})/);
  if (!match) {
    throw new Error(`Invalid ISO timestamp format: ${isoTimestamp}`);
  }
  return match[1];
}

/**
 * Convert Open-Meteo ISO timestamp (without TZ suffix) to Date in UTC.
 * Open-Meteo returns timestamps in the requested timezone but without suffix.
 * We need to interpret them correctly by applying the UTC offset.
 *
 * Example: "2026-03-03T00:00" with utc_offset_seconds=7200 (Asia/Jerusalem)
 *   → Represents 2026-03-03 00:00 in Asia/Jerusalem timezone
 *   → Equivalent to 2026-03-02 22:00 UTC
 */
function parseOpenMeteoTimestamp(isoString: string, utcOffsetSeconds: number): Date {
  // Append "Z" to force UTC interpretation, then subtract offset
  // This ensures consistent parsing regardless of server timezone
  const utcDate = new Date(isoString + "Z");

  // Subtract the UTC offset to convert from "local time" to actual UTC
  // If timezone is UTC+2 (7200s), a timestamp "00:00" in that zone is "22:00" UTC the previous day
  const utcTimestamp = utcDate.getTime() - utcOffsetSeconds * 1000;

  return new Date(utcTimestamp);
}

/**
 * Convert Open-Meteo forecast response to WindConditionRaw[].
 */
function extractWindData(forecast: OpenMeteoForecastResponse): WindConditionRaw[] {
  const { time, wind_speed_10m, wind_direction_10m, wind_gusts_10m } = forecast.hourly;

  if (!time || !wind_speed_10m) {
    throw new Error("Missing required forecast data (time or wind_speed_10m)");
  }

  const utcOffset = forecast.utc_offset_seconds;
  const windData: WindConditionRaw[] = [];

  for (let i = 0; i < time.length; i++) {
    windData.push({
      date: parseOpenMeteoTimestamp(time[i], utcOffset),
      windSpeed: wind_speed_10m[i] ?? null,
      windDirection: wind_direction_10m?.[i] ?? null,
      windGusts: wind_gusts_10m?.[i] ?? null,
      waveHeight: null,
      wavePeriod: null,
      waveDirection: null,
      swellHeight: null,
      swellPeriod: null,
      swellDirection: null,
    });
  }

  return windData;
}

type MarineDataPoint = {
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDirection: number | null;
  swellHeight: number | null;
  swellPeriod: number | null;
  swellDirection: number | null;
};

/**
 * Merge wave data into wind data in-place by matching timestamps.
 */
function mergeWaveData(
  windData: WindConditionRaw[],
  marineResponse: OpenMeteoMarineResponse,
): void {
  const {
    time,
    wave_height,
    wave_period,
    wave_direction,
    swell_wave_height,
    swell_wave_period,
    swell_wave_direction,
  } = marineResponse.hourly;

  if (!time || !wave_height) return;

  // Build timestamp → marine data map
  const utcOffset = marineResponse.utc_offset_seconds;
  const marineMap = new Map<number, MarineDataPoint>();
  for (let i = 0; i < time.length; i++) {
    const timestamp = parseOpenMeteoTimestamp(time[i], utcOffset).getTime();
    marineMap.set(timestamp, {
      waveHeight: wave_height[i] ?? null,
      wavePeriod: wave_period?.[i] ?? null,
      waveDirection: wave_direction?.[i] ?? null,
      swellHeight: swell_wave_height?.[i] ?? null,
      swellPeriod: swell_wave_period?.[i] ?? null,
      swellDirection: swell_wave_direction?.[i] ?? null,
    });
  }

  // Match by timestamp
  for (const condition of windData) {
    const marine = marineMap.get(condition.date.getTime());
    if (marine) {
      condition.waveHeight = marine.waveHeight;
      condition.wavePeriod = marine.wavePeriod;
      condition.waveDirection = marine.waveDirection;
      condition.swellHeight = marine.swellHeight;
      condition.swellPeriod = marine.swellPeriod;
      condition.swellDirection = marine.swellDirection;
    }
  }
}

/**
 * Fetch wind + wave + sunrise/sunset from Open-Meteo.
 *
 * @param lat Latitude (WGS84)
 * @param lon Longitude (WGS84)
 * @param model Open-Meteo model slug (e.g. "gfs_global", "icon_global")
 * @param tz Timezone (e.g. "Asia/Jerusalem")
 * @returns Wind data + sunrise/sunset in "HH:MM" format
 */
export async function fetchOpenMeteoData(
  lat: number,
  lon: number,
  model: string,
  tz: string,
): Promise<{
  windData: WindConditionRaw[];
  sunrise: string;
  sunset: string;
}> {
  // Fetch wind and wave models in parallel — wave failure is non-fatal
  const [windResult, waveResult] = await Promise.all([
    tryCatch(fetchForecast(lat, lon, model, tz)),
    tryCatch(fetchMarine(lat, lon, tz)),
  ]);

  if (windResult.error) {
    throw windResult.error;
  }

  const forecast = windResult.data;

  // Extract sunrise/sunset from daily data
  if (!forecast.daily?.sunrise?.[0] || !forecast.daily?.sunset?.[0]) {
    throw new Error("Missing sunrise/sunset data in forecast response");
  }

  const sunrise = extractTime(forecast.daily.sunrise[0]);
  const sunset = extractTime(forecast.daily.sunset[0]);

  // Convert forecast to WindConditionRaw[]
  const windData = extractWindData(forecast);

  // Merge wave data if available
  if (waveResult.error) {
    console.error(
      `Wave data fetch failed for ${lat},${lon} (non-fatal): ${waveResult.error.message}`,
    );
  } else {
    mergeWaveData(windData, waveResult.data);
  }

  return { windData, sunrise, sunset };
}
