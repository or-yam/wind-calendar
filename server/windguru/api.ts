import { Effect, Option } from "effect";
import type { APIRoot } from "../types/api-response";
import type { ProviderWindData, WindConditionRaw } from "../types/wind-conditions";
import { ProviderDataError, type ProviderError } from "../errors";
import { getForecast } from "./forecast";

const WAVE_MODEL_ID = 84;
const GFS_MODEL_ID = 3;

const TIME_RGX = /^\d{2}:\d{2}$/;

function validateTimeString(
  value: unknown,
  label: string,
): Effect.Effect<string, ProviderDataError> {
  if (typeof value !== "string" || !TIME_RGX.test(value)) {
    return Effect.fail(
      new ProviderDataError({
        message: `Invalid ${label} value from Windguru: ${JSON.stringify(value)}`,
      }),
    );
  }
  return Effect.succeed(value);
}

function extractWindData(forecast: APIRoot, spotId: string): WindConditionRaw[] {
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

    windData.push({
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
    });
  }

  return windData;
}

/** Merges wave height data into wind data in place. */
function mergeWaveData(windData: WindConditionRaw[], waveForecast: APIRoot): void {
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

/** Fetch the wind model, falling back to GFS (model 3) if a different model fails. */
function fetchWithGfsFallback(
  locationCode: string,
  modelId: number,
): Effect.Effect<APIRoot, ProviderError> {
  const primary = getForecast(locationCode, modelId);

  if (modelId === GFS_MODEL_ID) return primary;

  return primary.pipe(
    Effect.catch((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(
          `Model ${modelId} fetch failed for spot ${locationCode}, falling back to GFS (model ${GFS_MODEL_ID}): ${error.message}`,
        );
        return yield* getForecast(locationCode, GFS_MODEL_ID);
      }),
    ),
  );
}

export function fetchWindData(
  locationCode: string,
  modelId: number,
): Effect.Effect<ProviderWindData, ProviderError> {
  const wind = fetchWithGfsFallback(locationCode, modelId);
  const wave = getForecast(locationCode, WAVE_MODEL_ID).pipe(
    Effect.tapError((error) =>
      Effect.logError(
        `Wave model fetch failed for spot ${locationCode} (non-fatal): ${error.message}`,
      ),
    ),
    Effect.option,
  );

  return Effect.gen(function* () {
    const [windForecast, waveForecast] = yield* Effect.all([wind, wave], {
      concurrency: "unbounded",
    });

    const sunrise = yield* validateTimeString(windForecast.sunrise, "sunrise");
    const sunset = yield* validateTimeString(windForecast.sunset, "sunset");
    const windData = extractWindData(windForecast, locationCode);

    if (Option.isSome(waveForecast)) {
      mergeWaveData(windData, waveForecast.value);
    }

    return { windData, sunrise, sunset };
  });
}
