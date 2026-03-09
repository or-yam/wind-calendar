import type { APIRoot } from "../types/api-response.js";
import type { WindConditionRaw } from "../types/wind-conditions.js";
import { tryCatch } from "../utils/try-catch.js";
import { getForecast } from "./forecast.js";

type Forecast = Awaited<ReturnType<typeof getForecast>>;

const TIME_RGX = /^\d{2}:\d{2}$/;

function validateTimeString(value: unknown, label: string): string {
  if (typeof value !== "string" || !TIME_RGX.test(value)) {
    throw new Error(`Invalid ${label} value from Windguru: ${JSON.stringify(value)}`);
  }
  return value;
}

function extractWindData(forecast: Forecast, spotId: string): WindConditionRaw[] {
  const fcst = forecast.fcst;

  if (!fcst?.WINDSPD) {
    console.error(`No WINDSPD data in forecast for spot ${spotId} (model ${fcst?.id_model})`);
    return [];
  }

  const numPoints = fcst.WINDSPD.length;
  const initstamp = fcst.initstamp;

  const windData: WindConditionRaw[] = [];

  for (let i = 0; i < numPoints; i++) {
    const timestamp = initstamp + fcst.hours[i] * 3600;
    const date = new Date(timestamp * 1000);

    const windCondition: WindConditionRaw = {
      date,
      windSpeed: fcst.WINDSPD[i] ?? null,
      windGusts: fcst.GUST?.[i] ?? null,
      windDirection: fcst.WINDDIR?.[i] ?? null,
      waveHeight: null,
      wavePeriod: null,
      waveDirection: null,
      swellHeight: null,
      swellPeriod: null,
      swellDirection: null,
    };

    windData.push(windCondition);
  }

  return windData;
}

/** Merges wave height data into wind data in place. */
function mergeWaveData(windData: WindConditionRaw[], waveForecast: Forecast): void {
  const waveFcst = waveForecast.fcst as APIRoot["fcst"] & { HTSGW?: number[] };
  if (!waveFcst?.HTSGW) return;

  const waveMap = new Map<number, number>();
  const waveInit = waveFcst.initstamp;

  for (let i = 0; i < waveFcst.HTSGW.length; i++) {
    const timestamp = waveInit + waveFcst.hours[i] * 3600;
    const waveHeight = waveFcst.HTSGW[i];
    if (waveHeight != null) {
      waveMap.set(timestamp, waveHeight);
    }
  }

  for (const condition of windData) {
    const timestamp = Math.floor(condition.date.getTime() / 1000);
    const waveHeight = waveMap.get(timestamp);
    if (waveHeight !== undefined) {
      condition.waveHeight = waveHeight;
    }
  }
}

export async function fetchWindData(
  locationCode: string,
  modelId: number,
): Promise<{
  windData: WindConditionRaw[];
  sunrise: string;
  sunset: string;
}> {
  // Fetch wind and wave models independently — wave failure is non-fatal
  const [windResult, waveResult] = await Promise.all([
    tryCatch(getForecast(locationCode, modelId)),
    tryCatch(getForecast(locationCode, 84)),
  ]);

  if (windResult.error) {
    // Try to fallback to GFS (model 3) if a different model was requested
    if (modelId !== 3) {
      console.error(
        `Model ${modelId} fetch failed for spot ${locationCode}, falling back to GFS (model 3): ${windResult.error.message}`,
      );
      const fallbackResult = await tryCatch(getForecast(locationCode, 3));
      if (fallbackResult.error) {
        throw fallbackResult.error; // Both failed, propagate fallback error
      }
      // Use fallback data
      const sunrise = validateTimeString(fallbackResult.data.sunrise, "sunrise");
      const sunset = validateTimeString(fallbackResult.data.sunset, "sunset");
      const windData = extractWindData(fallbackResult.data, locationCode);
      if (waveResult.error) {
        console.error(
          `Wave model fetch failed for spot ${locationCode} (non-fatal): ${waveResult.error.message}`,
        );
      } else {
        mergeWaveData(windData, waveResult.data);
      }
      return { windData, sunrise, sunset };
    }
    throw windResult.error; // GFS itself failed — propagate original error
  }

  const sunrise = validateTimeString(windResult.data.sunrise, "sunrise");
  const sunset = validateTimeString(windResult.data.sunset, "sunset");

  const windData = extractWindData(windResult.data, locationCode);

  if (waveResult.error) {
    console.error(
      `Wave model fetch failed for spot ${locationCode} (non-fatal): ${waveResult.error.message}`,
    );
  } else {
    mergeWaveData(windData, waveResult.data);
  }

  return { windData, sunrise, sunset };
}
