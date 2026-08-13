import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULTS } from "../../shared/constants";
import {
  createConfigFeedbackToken,
  hashCalendarConfig,
  verifyConfigFeedbackToken,
} from "../../server/config-feedback-token";

const config = { ...DEFAULTS, locations: ["beit-yanai"], model: "om_gfs" as const };
const issuedAt = new Date("2026-08-13T12:00:00.000Z");

describe("config feedback tokens", () => {
  beforeEach(() => {
    process.env.LANGFUSE_FEEDBACK_SECRET = "feedback-test-secret";
  });

  afterEach(() => delete process.env.LANGFUSE_FEEDBACK_SECRET);

  it("binds an authentic token to trace and canonical config hash", () => {
    const reordered = Object.fromEntries(Object.entries(config).reverse()) as typeof config;
    const token = createConfigFeedbackToken("0123456789abcdef0123456789abcdef", config, issuedAt)!;

    expect(token).not.toContain("0123456789abcdef0123456789abcdef");
    expect(token).not.toContain(hashCalendarConfig(config));
    expect(hashCalendarConfig(reordered)).toBe(hashCalendarConfig(config));
    expect(verifyConfigFeedbackToken(token, issuedAt)).toMatchObject({
      traceId: "0123456789abcdef0123456789abcdef",
      generatedConfigHash: hashCalendarConfig(config),
      issuedAt: issuedAt.toISOString(),
    });
  });

  it("rejects tampering and expiration", () => {
    const token = createConfigFeedbackToken("0123456789abcdef0123456789abcdef", config, issuedAt)!;

    expect(verifyConfigFeedbackToken(`${token.slice(0, -1)}x`, issuedAt)).toBeUndefined();
    expect(
      verifyConfigFeedbackToken(token, new Date(issuedAt.getTime() + 8 * 24 * 60 * 60 * 1000)),
    ).toBeUndefined();
  });
});
