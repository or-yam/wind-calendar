import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "../../../shared/constants";
import type { CalendarConfig } from "../../../shared/types";
import { createConfigFeedbackToken } from "../../../server/config-feedback-token";
import { callHandler } from "../../helpers/nitro-mocks";

const { scoreConfigConfirmation } = vi.hoisted(() => ({
  scoreConfigConfirmation: vi.fn(),
}));
vi.mock("../../../server/langfuse-feedback", () => ({ scoreConfigConfirmation }));

import handler from "../../../server/api/config-feedback";

const generatedConfig: CalendarConfig = {
  ...DEFAULTS,
  locations: ["beit-yanai"],
  model: "om_gfs",
};
const issuedAt = new Date("2026-08-13T12:00:00.000Z");

describe("POST /api/config-feedback", () => {
  beforeEach(() => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-test";
    process.env.LANGFUSE_FEEDBACK_SECRET = "feedback-test-secret";
    scoreConfigConfirmation.mockReset();
    scoreConfigConfirmation.mockResolvedValue(undefined);
    vi.useFakeTimers().setSystemTime(issuedAt);
  });

  afterEach(() => {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    delete process.env.LANGFUSE_FEEDBACK_SECRET;
    vi.useRealTimers();
  });

  async function send(
    confirmedConfig = generatedConfig,
    token = createConfigFeedbackToken(
      "0123456789abcdef0123456789abcdef",
      generatedConfig,
      issuedAt,
    )!,
  ) {
    return callHandler(handler, "/api/config-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, confirmedConfig }),
    });
  }

  it("records authentic unchanged feedback with a deterministic score ID", async () => {
    const first = await send();
    const firstCall = scoreConfigConfirmation.mock.calls[0];
    const second = await send();

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(JSON.parse(first.body)).toEqual({ recorded: true });
    expect(firstCall).toEqual([
      "0123456789abcdef0123456789abcdef",
      true,
      expect.stringMatching(/^[0-9a-f]{64}$/),
    ]);
    expect(scoreConfigConfirmation.mock.calls[1]?.[2]).toBe(firstCall?.[2]);
  });

  it("derives edited feedback from the signed generated-config hash", async () => {
    const response = await send({ ...generatedConfig, windMin: 15 });

    expect(response.statusCode).toBe(200);
    expect(scoreConfigConfirmation).toHaveBeenCalledWith(
      "0123456789abcdef0123456789abcdef",
      false,
      expect.any(String),
    );
  });

  it("rejects tampered tokens and invalid configs", async () => {
    const token = createConfigFeedbackToken(
      "0123456789abcdef0123456789abcdef",
      generatedConfig,
      issuedAt,
    )!;
    const response = await send(
      { ...generatedConfig, locations: ["unknown"] } as typeof generatedConfig,
      `${token.slice(0, -1)}x`,
    );

    expect(response.statusCode).toBe(400);
    expect(scoreConfigConfirmation).not.toHaveBeenCalled();
  });

  it("returns unavailable rather than claiming disabled feedback was recorded", async () => {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    scoreConfigConfirmation.mockRejectedValue(new Error("disabled"));

    const response = await send();

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('"recorded":true');
  });

  it("returns bad gateway when Langfuse score ingestion fails", async () => {
    scoreConfigConfirmation.mockRejectedValue(new Error("flush failed"));

    const response = await send();

    expect(response.statusCode).toBe(502);
    expect(response.body).not.toContain('"recorded":true');
  });
});
