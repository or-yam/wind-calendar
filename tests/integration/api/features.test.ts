import { beforeEach, describe, expect, it, vi } from "vitest";
import { callHandler } from "../../helpers/nitro-mocks";

const { isFeatureEnabled } = vi.hoisted(() => ({ isFeatureEnabled: vi.fn() }));
vi.mock("../../../server/feature-flags", () => ({
  FEATURE_FLAGS: { freeTextConfigBuilder: "free-text-config-builder" },
  isFeatureEnabled,
}));

import handler from "../../../server/api/features";

describe("GET /api/features", () => {
  beforeEach(() => {
    isFeatureEnabled.mockReset();
  });

  it("returns client-safe feature availability", async () => {
    isFeatureEnabled.mockResolvedValue(true);

    const response = await callHandler(handler, "/api/features");

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ freeTextConfigBuilder: true });
    expect(isFeatureEnabled).toHaveBeenCalledWith("free-text-config-builder");
  });

  it("rejects unsupported methods", async () => {
    const response = await callHandler(handler, "/api/features", { method: "POST" });

    expect(response.statusCode).toBe(405);
    expect(isFeatureEnabled).not.toHaveBeenCalled();
  });
});
