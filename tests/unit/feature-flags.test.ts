import { afterEach, describe, expect, it, vi } from "vitest";

const { evaluate } = vi.hoisted(() => ({ evaluate: vi.fn() }));
vi.mock("@vercel/flags-core", () => ({ flagsClient: { evaluate } }));

import { FEATURE_FLAGS, isFeatureEnabled } from "../../server/feature-flags";

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
