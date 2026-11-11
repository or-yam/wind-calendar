import { Effect, Option } from "effect";
import { errorDetails } from "../utils/error-details.js";
import type { ProviderWindData, WindConditionRaw } from "../types/wind-conditions.js";
import { ProviderDataError, type ProviderError } from "../errors.js";
import type { OpenMeteoForecastResponse, OpenMeteoMarineResponse } from "./types.js";
import { fetchForecast, fetchMarine } from "./fetch.js";
import { parseOpenMeteoTimestamp } from "./timestamp.js";
import { extractDaylight } from "./daylight.js";

/**
 * Convert Open-Meteo forecast response to WindConditionRaw[].
 */
function extractWindData(
  forecast: OpenMeteoForecastResponse,
): Effect.Effect<WindConditionRaw[], ProviderDataError> {
  const { time, wind_speed_10m, wind_direction_10m, wind_gusts_10m } = forecast.hourly;

  if (!time || !wind_speed_10m) {
    return Effect.fail(
      new ProviderDataError({ message: "Missing required forecast data (time or wind_speed_10m)" }),
    );
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

  return Effect.succeed(windData);
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
export function fetchOpenMeteoData(
  lat: number,
  lon: number,
  model: string,
  tz: string,
): Effect.Effect<ProviderWindData, ProviderError> {
  // Fetch wind and wave models in parallel — wave failure is non-fatal
  const wind = fetchForecast(lat, lon, model, tz);
  const wave = fetchMarine(lat, lon, tz).pipe(
    Effect.tapError((error) =>
      Effect.logWarning("wave_data_unavailable").pipe(
        Effect.annotateLogs({
          ...errorDetails(error),
          provider: "openmeteo",
          providerModel: model,
          latitude: lat,
          longitude: lon,
        }),
      ),
    ),
    Effect.option,
  );

  return Effect.gen(function* () {
    const [forecast, waveResult] = yield* Effect.all([wind, wave], { concurrency: "unbounded" });

    const daylight = yield* extractDaylight(forecast);
    const sunrise = forecast.daily!.sunrise[0].slice(11, 16);
    const sunset = forecast.daily!.sunset[0].slice(11, 16);
    const windData = yield* extractWindData(forecast);

    if (Option.isSome(waveResult)) {
      mergeWaveData(windData, waveResult.value);
    }

    return { windData, sunrise, sunset, daylight };
  });
}
