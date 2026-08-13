import { flagsClient } from "@vercel/flags-core";
import { tryCatch } from "./utils/try-catch.js";

export const FEATURE_FLAGS = {
  freeTextConfigBuilder: "free-text-config-builder",
} as const;

export async function isFeatureEnabled(flag: (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]) {
  const { data: result, error } = await tryCatch(flagsClient.evaluate<boolean>(flag, false));
  if (error) {
    console.warn(
      JSON.stringify({
        level: "warning",
        message: "feature_flag_evaluation_failed",
      }),
    );
    return false;
  }

  return result.value;
}
