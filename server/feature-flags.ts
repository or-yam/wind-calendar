import { flagsClient } from "@vercel/flags-core";

export const FEATURE_FLAGS = {
  freeTextConfigBuilder: "free-text-config-builder",
} as const;

export async function isFeatureEnabled(flag: (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]) {
  try {
    const result = await flagsClient.evaluate<boolean>(flag, false);
    return result.value;
  } catch (error) {
    console.error(`Feature flag evaluation failed for ${flag}`, error);
    return false;
  }
}
