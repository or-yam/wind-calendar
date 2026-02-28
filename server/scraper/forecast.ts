import { fetchSpotInfo, fetchModelForecast, ApiError } from "./fetch.js";
import { tryCatch } from "../utils/try-catch.js";

export async function getForecast(spotId: string, modelId?: number) {
  const { data: spotInfo, error: spotError } = await tryCatch(fetchSpotInfo(spotId));

  if (spotError) {
    if (spotError instanceof ApiError) throw spotError;
    throw new Error(`Failed to get spot info for ${spotId}: ${spotError.message}`);
  }

  const models = spotInfo.spots[spotId].models;

  if (!models?.length) {
    throw new Error(`No forecast models available for spot ${spotId}`);
  }

  if (modelId && !models.some((m) => m === modelId)) {
    throw new Error(`Model ${modelId} not available for spot ${spotId}`);
  }

  const modelsToFetch = modelId ? models.filter((m) => m === modelId) : models;

  // Find the tab that contains the model information
  const modelInfos = spotInfo.tabs
    .flatMap((tab) => tab.id_model_arr)
    .find((info) => info.id_model === modelId);

  const forecasts = await Promise.all(
    modelsToFetch.map(async (mid) => {
      const modelInfo = modelInfos;
      if (!modelInfo) {
        console.error(`Model info not found for model ${mid} in spot ${spotId}`);
        return null;
      }

      const { data, error } = await tryCatch(fetchModelForecast(spotId, mid, modelInfo.rundef));
      if (error) {
        console.error(`Failed to fetch model ${mid} for spot ${spotId}: ${error.message}`);
        return null;
      }
      return data;
    }),
  );

  const validForecasts = forecasts.filter(Boolean);

  if (validForecasts.length === 0) {
    throw new Error(`Failed to fetch any valid forecasts for spot ${spotId}`);
  }

  return validForecasts[0]!;
}
