import { defineHandler, HTTPError } from "nitro";
import { readBody } from "nitro/h3";
import { z } from "zod";
import { calendarConfigSchema } from "../../shared/calendar-config-schema.js";
import {
  configConfirmationScoreId,
  hashCalendarConfig,
  verifyConfigFeedbackToken,
} from "../config-feedback-token.js";
import { scoreConfigConfirmation } from "../langfuse-feedback.js";
import { getClientIp } from "../utils/api-handler.js";
import { checkRateLimit } from "../utils/rate-limit.js";

export const configFeedbackSchema = z
  .object({
    token: z.string().min(80).max(1_000),
    confirmedConfig: calendarConfigSchema,
  })
  .strict();

export default defineHandler(async (event) => {
  if (event.req.method !== "POST") {
    throw new HTTPError({ statusCode: 405, statusMessage: "Method Not Allowed" });
  }

  const rateCheck = checkRateLimit(`ai-feedback:${getClientIp(event)}`);
  if (rateCheck.limited) {
    event.res.headers.set("Retry-After", rateCheck.retryAfter.toString());
    throw new HTTPError({ statusCode: 429, statusMessage: "Too Many Requests" });
  }

  const parsed = configFeedbackSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw new HTTPError({ statusCode: 400, statusMessage: "Bad Request" });
  }

  const evidence = verifyConfigFeedbackToken(parsed.data.token);
  if (!evidence) throw new HTTPError({ statusCode: 400, statusMessage: "Invalid feedback token" });

  const unchanged =
    evidence.generatedConfigHash === hashCalendarConfig(parsed.data.confirmedConfig);
  try {
    await scoreConfigConfirmation(evidence.traceId, unchanged, configConfirmationScoreId(evidence));
  } catch (error) {
    console.warn("Config feedback was not recorded", error);
    throw new HTTPError({
      statusCode: process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY ? 502 : 503,
      statusMessage: "Feedback unavailable",
    });
  }

  event.res.headers.set("Cache-Control", "no-store");
  return { recorded: true };
});
