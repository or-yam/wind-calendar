import { beforeEach, describe, expect, it, vi } from "vitest";
import { callHandler } from "../../helpers/nitro-mocks";

const { getFeatureFlags } = vi.hoisted(() => ({ getFeatureFlags: vi.fn() }));
vi.mock("../../../server/feature-flags", () => ({
  getFeatureFlags,
}));

import handler from "../../../server/api/features.get";

describe("GET /api/features", () => {
  beforeEach(() => {
    getFeatureFlags.mockReset();
  });

  it("returns the evaluated feature flags", async () => {
    const features = {
      freeTextConfigBuilder: true,
      wavesForecast: false,
      windguruForecastModels: true,
    };
    getFeatureFlags.mockResolvedValue(features);

    const response = await callHandler(handler, "/api/features");

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, max-age=15");
    expect(JSON.parse(response.body)).toEqual(features);
    expect(getFeatureFlags).toHaveBeenCalledOnce();
  });
});
