import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { bulkEvaluate, evaluate } = vi.hoisted(() => ({
  bulkEvaluate: vi.fn(),
  evaluate: vi.fn(),
}));
vi.mock("@vercel/flags-core", () => ({ flagsClient: { bulkEvaluate, evaluate } }));

import { FEATURE_FLAGS, getFeatureFlags, isFeatureEnabled } from "../../server/feature-flags";

beforeEach(() => {
  bulkEvaluate.mockReset();
  evaluate.mockReset();
});

describe("isFeatureEnabled", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the evaluated flag value", async () => {
    evaluate.mockResolvedValue({ value: true });

    await expect(isFeatureEnabled(FEATURE_FLAGS.freeTextConfigBuilder)).resolves.toBe(true);
    expect(evaluate).toHaveBeenCalledWith("free-text-config-builder", false);
  });

  it("fails closed when evaluation throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    evaluate.mockRejectedValue(new Error("unavailable"));

    await expect(isFeatureEnabled(FEATURE_FLAGS.freeTextConfigBuilder)).resolves.toBe(false);
  });
});

describe("getFeatureFlags", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("evaluates and maps all defined flags", async () => {
    bulkEvaluate.mockResolvedValue({
      "free-text-config-builder": { value: true },
      "waves-forecast": { value: false },
      "windguru-forecast-models": { value: true },
    });

    await expect(getFeatureFlags()).resolves.toEqual({
      freeTextConfigBuilder: true,
      wavesForecast: false,
      windguruForecastModels: true,
    });
    expect(bulkEvaluate).toHaveBeenCalledWith([
      { key: "free-text-config-builder", defaultValue: false },
      { key: "waves-forecast", defaultValue: false },
      { key: "windguru-forecast-models", defaultValue: false },
    ]);
  });

  it("fails all flags closed when bulk evaluation throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    bulkEvaluate.mockRejectedValue(new Error("unavailable"));

    await expect(getFeatureFlags()).resolves.toEqual({
      freeTextConfigBuilder: false,
      wavesForecast: false,
      windguruForecastModels: false,
    });
  });
});
