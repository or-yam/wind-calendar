import { Effect } from "effect";
import type { APIRoot } from "../types/api-response";
import { ProviderDataError, type ProviderError } from "../errors";
import { fetchSpotInfo, fetchModelForecast } from "./fetch";

export function getForecast(
  spotId: string,
  modelId: number,
): Effect.Effect<APIRoot, ProviderError> {
  return Effect.gen(function* () {
    const spotInfo = yield* fetchSpotInfo(spotId);

    const models = spotInfo.spots[spotId]?.models;

    if (!models?.length) {
      return yield* new ProviderDataError({
        message: `No forecast models available for spot ${spotId}`,
      });
    }

    if (!models.some((m) => m === modelId)) {
      return yield* new ProviderDataError({
        message: `Model ${modelId} not available for spot ${spotId}`,
      });
    }

    // Find the tab that contains the model information
    const modelInfo = spotInfo.tabs
      .flatMap((tab) => tab.id_model_arr)
      .find((info) => info.id_model === modelId);

    if (!modelInfo) {
      return yield* new ProviderDataError({
        message: `Model info not found for model ${modelId} in spot ${spotId}`,
      });
    }

    return yield* fetchModelForecast(spotId, modelId, modelInfo.rundef).pipe(
      Effect.mapError(
        (error) =>
          new ProviderDataError({
            cause: error,
            message: `Failed to fetch model ${modelId} for spot ${spotId}: ${error.message}`,
          }),
      ),
    );
  }).pipe(Effect.annotateLogs({ provider: "windguru", spotId, providerModel: modelId }));
}
