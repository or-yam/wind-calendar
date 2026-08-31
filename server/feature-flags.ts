import { flagsClient } from "@vercel/flags-core";
import { tryCatch } from "./utils/try-catch.js";

export const FEATURE_FLAGS = {
  freeTextConfigBuilder: "free-text-config-builder",
  wavesForecast: "waves-forecast",
  windguruForecastModels: "windguru-forecast-models",
} as const;

export async function isFeatureEnabled(flag: (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]) {
  const { data: result, error } = await tryCatch(flagsClient.evaluate<boolean>(flag, false));
  if (error) {
    console.error(`Feature flag evaluation failed for ${flag}`, error);
    return false;
  }

  return result.value;
}
