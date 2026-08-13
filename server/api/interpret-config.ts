import { defineHandler, HTTPError } from "nitro";
import { readBody } from "nitro/h3";
import { z } from "zod";
import { interpretFreeTextConfig } from "../free-text-config.js";
import { checkRateLimit } from "../utils/rate-limit.js";
import { getClientIp } from "../utils/api-handler.js";
import { tryCatch } from "../utils/try-catch.js";
import { FEATURE_FLAGS, isFeatureEnabled } from "../feature-flags.js";

export const freeTextRequestSchema = z
  .object({
    request: z
      .string()
      .trim()
      .min(10, "Describe your preferred conditions in at least 10 characters")
      .max(500, "Description must be 500 characters or fewer")
      .refine(
        (value) =>
          Array.from(value).every((character) => {
            const code = character.charCodeAt(0);
            return code >= 32 || code === 9 || code === 10 || code === 13;
          }),
        { message: "Description contains unsupported control characters" },
      ),
  })
  .strict();

export default defineHandler(async (event) => {
  if (event.req.method !== "POST") {
    throw new HTTPError({ statusCode: 405, statusMessage: "Method Not Allowed" });
  }

  if (!(await isFeatureEnabled(FEATURE_FLAGS.freeTextConfigBuilder))) {
    throw new HTTPError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const rateCheck = checkRateLimit(`ai:${getClientIp(event)}`);
  if (rateCheck.limited) {
    event.res.headers.set("Retry-After", rateCheck.retryAfter.toString());
    throw new HTTPError({ statusCode: 429, statusMessage: "Too Many Requests" });
  }

  const parsed = freeTextRequestSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw new HTTPError({
      statusCode: 400,
      statusMessage: "Bad Request",
      data: { error: parsed.error.issues[0]?.message ?? "Invalid request" },
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new HTTPError({
      statusCode: 503,
      statusMessage: "AI configuration unavailable",
      data: { error: "Free-text configuration is not set up" },
    });
  }

  const { data: result, error } = await tryCatch(interpretFreeTextConfig(parsed.data.request));
  if (error) {
    console.error("Free-text configuration failed", error);
    throw new HTTPError({
      statusCode: 502,
      statusMessage: "AI interpretation failed",
      data: { error: "Could not interpret that request. Try again or use the manual form." },
    });
  }

  event.res.headers.set("Cache-Control", "no-store");
  return result;
});
