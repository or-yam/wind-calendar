import { describe, expect, it } from "vitest";
import { DEFAULTS } from "../../shared/constants";
import { featuresQueryOptions } from "../../src/lib/features-query";
import { forecastQueryOptions } from "../../src/lib/forecast-query";

describe("analytics query instrumentation", () => {
  it("does not override the global React Query retry policy", () => {
    const config = { ...DEFAULTS, locations: [...DEFAULTS.locations] };

    expect(forecastQueryOptions(config).retry).toBeUndefined();
    expect(featuresQueryOptions.retry).toBeUndefined();
  });
});
