import { openai } from "@ai-sdk/openai";
import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { calendarConfigSchema } from "../shared/calendar-config-schema.js";
import { DEFAULTS } from "../shared/constants.js";
import { LOCATIONS } from "../shared/locations.js";
import type { InterpretConfigResponse } from "../shared/types.js";

const interpretationSchema = z
  .object({
    outcome: z.enum(["configured", "insufficient", "unsupported"]),
    message: z.string().min(1).max(240),
    config: calendarConfigSchema,
  })
  .strict();

const defaults = { ...DEFAULTS, locations: [...DEFAULTS.locations] };

export async function interpretNaturalLanguageConfig(
  request: string,
  model: LanguageModel = openai("gpt-4.1-mini"),
): Promise<InterpretConfigResponse> {
  const { output } = await generateText({
    model,
    output: Output.object({ schema: interpretationSchema, name: "calendar_configuration" }),
    instructions: `Convert English or Hebrew requests into a wind forecast calendar configuration.
Supported location IDs and labels: ${Object.entries(LOCATIONS)
      .map(([id, location]) => `${id} (${location.label})`)
      .join(", ")}.
Use only those location IDs. Use om_gfs unless the user explicitly requests another supported model.
Defaults: ${JSON.stringify(defaults)}.
The configuration filters deterministic forecast data; do not claim to forecast weather.
If the request is unrelated to wind, waves, surfing, windsurfing, or kitesurfing, return outcome unsupported and defaults.
If the request is relevant but lacks enough concrete information to safely choose conditions, especially a location or meaningful wind/wave criteria, return outcome insufficient and defaults. Kite size and skill level alone are not enough to infer safe wind thresholds.
For configured output, preserve defaults for omitted non-safety options and summarize assumptions in message.
Keep message in English. Always return a complete configuration.`,
    prompt: request,
  });

  return interpretationSchema.parse(output);
}
