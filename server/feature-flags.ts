import { flagsClient } from "@vercel/flags-core";
import { tryCatch } from "./utils/try-catch.js";

export const FEATURE_FLAGS = {
  freeTextConfigBuilder: "free-text-config-builder",
  wavesForecast: "waves-forecast",
  windguruForecastModels: "windguru-forecast-models",
} as const;

type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
export type FeatureFlags = { [Key in keyof typeof FEATURE_FLAGS]: boolean };

export async function isFeatureEnabled(flag: FeatureFlag) {
  const { data: result, error } = await tryCatch(flagsClient.evaluate<boolean>(flag, false));
  if (error) {
    console.error(`Feature flag evaluation failed for ${flag}`, error);
    return false;
  }

  return result.value;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const entries = Object.entries(FEATURE_FLAGS) as [keyof FeatureFlags, FeatureFlag][];
  const { data: results, error } = await tryCatch(
    flagsClient.bulkEvaluate<boolean>(entries.map(([, key]) => ({ key, defaultValue: false }))),
  );

  if (error) console.error("Feature flag bulk evaluation failed", error);

  return Object.fromEntries(
    entries.map(([name, key]) => [name, results?.[key]?.value ?? false]),
  ) as FeatureFlags;
}
