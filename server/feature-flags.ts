import { flagsClient } from "@vercel/flags-core";
import { Effect } from "effect";
import { ExternalError } from "./errors.js";

export const FEATURE_FLAGS = {
  freeTextConfigBuilder: "free-text-config-builder",
  wavesForecast: "waves-forecast",
  windguruForecastModels: "windguru-forecast-models",
} as const;

type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
export type FeatureFlags = { [Key in keyof typeof FEATURE_FLAGS]: boolean };

export async function isFeatureEnabled(flag: FeatureFlag) {
  const result = await Effect.runPromise(
    Effect.tryPromise({
      try: () => flagsClient.evaluate<boolean>(flag, false),
      catch: (cause) =>
        new ExternalError({ message: `Feature flag evaluation failed for ${flag}`, cause }),
    }).pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          console.error(error.message, error.cause);
          return null;
        }),
      ),
    ),
  );

  return result?.value ?? false;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const entries = Object.entries(FEATURE_FLAGS) as [keyof FeatureFlags, FeatureFlag][];

  const results = await Effect.runPromise(
    Effect.tryPromise({
      try: () =>
        flagsClient.bulkEvaluate<boolean>(entries.map(([, key]) => ({ key, defaultValue: false }))),
      catch: (cause) =>
        new ExternalError({ message: "Feature flag bulk evaluation failed", cause }),
    }).pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          console.error(error.message, error.cause);
          return undefined;
        }),
      ),
    ),
  );

  return Object.fromEntries(
    entries.map(([name, key]) => [name, results?.[key]?.value ?? false]),
  ) as FeatureFlags;
}
