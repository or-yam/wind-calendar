import { fetchSpotInfo, fetchModelForecast, ApiError } from "./fetch";
import { tryCatch } from "../utils/try-catch";

export async function getForecast(spotId: string, modelId: number) {
  const { data: spotInfo, error: spotError } = await tryCatch(fetchSpotInfo(spotId));

  if (spotError) {
    if (spotError instanceof ApiError) throw spotError;
    throw new Error(`Failed to get spot info for ${spotId}: ${spotError.message}`);
  }

  const models = spotInfo.spots[spotId].models;

  if (!models?.length) {
    throw new Error(`No forecast models available for spot ${spotId}`);
  }

  if (!models.some((m) => m === modelId)) {
    throw new Error(`Model ${modelId} not available for spot ${spotId}`);
  }

  // Find the tab that contains the model information
  const modelInfo = spotInfo.tabs
    .flatMap((tab) => tab.id_model_arr)
    .find((info) => info.id_model === modelId);

  if (!modelInfo) {
    throw new Error(`Model info not found for model ${modelId} in spot ${spotId}`);
  }

  const { data, error } = await tryCatch(fetchModelForecast(spotId, modelId, modelInfo.rundef));

  if (error) {
    throw new Error(`Failed to fetch model ${modelId} for spot ${spotId}: ${error.message}`);
  }

  return data;
}
