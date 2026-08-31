import { beforeEach, describe, expect, it, vi } from "vitest";
import { callHandler } from "../../helpers/nitro-mocks";

const { isFeatureEnabled } = vi.hoisted(() => ({ isFeatureEnabled: vi.fn() }));
vi.mock("../../../server/feature-flags", () => ({
  FEATURE_FLAGS: {
    freeTextConfigBuilder: "free-text-config-builder",
    wavesForecast: "waves-forecast",
    windguruForecastModels: "windguru-forecast-models",
  },
  isFeatureEnabled,
}));

import handler from "../../../server/api/features";

describe("GET /api/features", () => {
  beforeEach(() => {
    isFeatureEnabled.mockReset();
  });

  it.each([
    [
      "free-text-config-builder",
      { freeTextConfigBuilder: true, wavesForecast: false, windguruForecastModels: false },
    ],
    [
      "waves-forecast",
      { freeTextConfigBuilder: false, wavesForecast: true, windguruForecastModels: false },
    ],
    [
      "windguru-forecast-models",
      { freeTextConfigBuilder: false, wavesForecast: false, windguruForecastModels: true },
    ],
  ])("maps the %s flag to its client-safe property", async (enabledFlag, expected) => {
    isFeatureEnabled.mockImplementation(async (flag: string) => flag === enabledFlag);

    const response = await callHandler(handler, "/api/features");

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(expected);
    expect(isFeatureEnabled).toHaveBeenCalledWith("free-text-config-builder");
    expect(isFeatureEnabled).toHaveBeenCalledWith("waves-forecast");
    expect(isFeatureEnabled).toHaveBeenCalledWith("windguru-forecast-models");
  });

  it("rejects unsupported methods", async () => {
    const response = await callHandler(handler, "/api/features", { method: "POST" });

    expect(response.statusCode).toBe(405);
    expect(isFeatureEnabled).not.toHaveBeenCalled();
  });
});
