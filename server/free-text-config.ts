import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { calendarConfigSchema } from "../shared/calendar-config-schema.js";
import { DEFAULTS } from "../shared/constants.js";
import { LOCATIONS } from "../shared/locations.js";
import type { InterpretConfigResponse } from "../shared/types.js";
import { createConfigFeedbackToken } from "./config-feedback-token.js";
import { observeFreeTextConfig } from "./langfuse.js";

const interpretationSchema = z
  .object({
    outcome: z.enum(["configured", "insufficient", "unsupported"]),
    message: z.string().min(1).max(240),
    config: calendarConfigSchema,
  })
  .strict();

const defaults = JSON.stringify({
  ...DEFAULTS,
  locations: [...DEFAULTS.locations],
});
const locations = Object.entries(LOCATIONS)
  .map(([id, location]) => `${id} (${location.label})`)
  .join(", ");

const instructions = `Convert requests into a wind forecast calendar configuration.
- Supported location IDs and labels: ${locations}. Use only those location IDs. Use om_gfs unless the user explicitly requests another supported model.
- Defaults: ${defaults}.
- The configuration filters deterministic forecast data; do not claim to forecast weather.
- If the request is unrelated to wind, waves, or water sports, return outcome unsupported and defaults.
- If the request is relevant but lacks enough concrete information to safely choose conditions, especially a location or meaningful wind/wave criteria, return outcome insufficient and defaults. Kite size and skill level alone are not enough to infer safe wind thresholds.
For configured output, preserve defaults for omitted non-safety options and summarize assumptions in message.
Keep message in English. Always return a complete configuration.`;

const model = openai("gpt-4.1-mini");
export const FREE_TEXT_CONFIG_PROMPT_VERSION = "free-text-config-v1";

export async function interpretFreeTextConfig(request: string): Promise<InterpretConfigResponse> {
  const { result, traceId } = await observeFreeTextConfig(
    request,
    FREE_TEXT_CONFIG_PROMPT_VERSION,
    async (telemetryEnabled) => {
      const { output } = await generateText({
        model,
        output: Output.object({
          schema: interpretationSchema,
          name: "calendar_configuration",
        }),
        instructions,
        prompt: request,
        runtimeContext: { promptVersion: FREE_TEXT_CONFIG_PROMPT_VERSION },
        telemetry: {
          isEnabled: telemetryEnabled,
          functionId: "generate-free-text-config",
          includeRuntimeContext: { promptVersion: true },
        },
      });

      return interpretationSchema.parse(output);
    },
  );

  const feedbackToken = traceId ? createConfigFeedbackToken(traceId, result.config) : undefined;
  return { ...result, ...(feedbackToken && { feedbackToken }) };
}
