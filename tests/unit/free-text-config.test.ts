import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "../../shared/constants";

const { createConfigFeedbackToken, generateText, observeFreeTextConfig } = vi.hoisted(() => ({
  createConfigFeedbackToken: vi.fn(),
  generateText: vi.fn(),
  observeFreeTextConfig: vi.fn(),
}));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText,
}));
vi.mock("../../server/langfuse", () => ({ observeFreeTextConfig }));
vi.mock("../../server/config-feedback-token", () => ({ createConfigFeedbackToken }));

import {
  FREE_TEXT_CONFIG_PROMPT_VERSION,
  interpretFreeTextConfig,
} from "../../server/free-text-config";

const output = {
  outcome: "configured" as const,
  message: "Configured.",
  config: { ...DEFAULTS, locations: ["beit-yanai"], model: "om_gfs" as const },
};

describe("interpretFreeTextConfig observability", () => {
  beforeEach(() => {
    generateText.mockResolvedValue({ output });
    createConfigFeedbackToken.mockReturnValue("opaque-feedback-token");
    observeFreeTextConfig.mockImplementation(
      async (
        _input: string,
        _version: string,
        operation: (enabled: boolean) => Promise<unknown>,
      ) => ({
        result: await operation(true),
        traceId: "0123456789abcdef0123456789abcdef",
      }),
    );
  });

  it("identifies the code prompt and returns the correlation trace ID", async () => {
    const result = await interpretFreeTextConfig("Kitesurfing at Beit Yanai, 14-20 knots");

    expect(observeFreeTextConfig).toHaveBeenCalledWith(
      "Kitesurfing at Beit Yanai, 14-20 knots",
      FREE_TEXT_CONFIG_PROMPT_VERSION,
      expect.any(Function),
    );
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        telemetry: {
          isEnabled: true,
          functionId: "generate-free-text-config",
          includeRuntimeContext: { promptVersion: true },
        },
        runtimeContext: { promptVersion: FREE_TEXT_CONFIG_PROMPT_VERSION },
      }),
    );
    expect(createConfigFeedbackToken).toHaveBeenCalledWith(
      "0123456789abcdef0123456789abcdef",
      output.config,
    );
    expect(result.feedbackToken).toBe("opaque-feedback-token");
  });

  it("preserves the response shape when observability is disabled", async () => {
    observeFreeTextConfig.mockImplementation(
      async (
        _input: string,
        _version: string,
        operation: (enabled: boolean) => Promise<unknown>,
      ) => ({
        result: await operation(false),
      }),
    );

    const result = await interpretFreeTextConfig("Kitesurfing at Beit Yanai, 14-20 knots");

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ telemetry: expect.objectContaining({ isEnabled: false }) }),
    );
    expect(result).toEqual(output);
  });
});
