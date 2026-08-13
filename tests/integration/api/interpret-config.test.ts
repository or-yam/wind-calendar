import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "../../../shared/constants";
import { callHandler } from "../../helpers/nitro-mocks";

const { interpretFreeTextConfig } = vi.hoisted(() => ({
  interpretFreeTextConfig: vi.fn(),
}));
vi.mock("../../../server/free-text-config", () => ({ interpretFreeTextConfig }));
const { isFeatureEnabled } = vi.hoisted(() => ({ isFeatureEnabled: vi.fn() }));
vi.mock("../../../server/feature-flags", () => ({
  FEATURE_FLAGS: { freeTextConfigBuilder: "free-text-config-builder" },
  isFeatureEnabled,
}));

import handler from "../../../server/api/interpret-config";

describe("POST /api/interpret-config", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    isFeatureEnabled.mockResolvedValue(true);
    interpretFreeTextConfig.mockResolvedValue({
      outcome: "configured",
      message: "Found explicit conditions.",
      config: { ...DEFAULTS, locations: ["beit-yanai"], model: "om_gfs" },
    });
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.clearAllMocks();
  });

  it("returns a structured interpreted configuration", async () => {
    const response = await callHandler(handler, "/api/interpret-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: "Beginner kitesurfing at Beit Yanai, 14-20 knots" }),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ outcome: "configured" });
    expect(interpretFreeTextConfig).toHaveBeenCalledWith(
      "Beginner kitesurfing at Beit Yanai, 14-20 knots",
    );
  });

  it("rejects invalid input before calling the model", async () => {
    const response = await callHandler(handler, "/api/interpret-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: "kite" }),
    });

    expect(response.statusCode).toBe(400);
    expect(interpretFreeTextConfig).not.toHaveBeenCalled();
  });

  it("hides the endpoint while the feature is disabled", async () => {
    isFeatureEnabled.mockResolvedValue(false);
    const response = await callHandler(handler, "/api/interpret-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: "Kitesurfing at Beit Yanai with 14-20 knots" }),
    });

    expect(response.statusCode).toBe(404);
    expect(interpretFreeTextConfig).not.toHaveBeenCalled();
  });

  it("returns a clear setup error without a server key", async () => {
    delete process.env.OPENAI_API_KEY;
    const response = await callHandler(handler, "/api/interpret-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: "Kitesurfing at Beit Yanai with 14-20 knots" }),
    });

    expect(response.statusCode).toBe(503);
    expect(interpretFreeTextConfig).not.toHaveBeenCalled();
  });

  it("hides model errors behind an actionable response", async () => {
    interpretFreeTextConfig.mockRejectedValue(new Error("provider secret details"));
    const response = await callHandler(handler, "/api/interpret-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: "Kitesurfing at Beit Yanai with 14-20 knots" }),
    });

    expect(response.statusCode).toBe(502);
    expect(response.body).toContain("Could not interpret that request");
    expect(response.body).not.toContain("provider secret details");
  });
});
