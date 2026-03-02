import { describe, it, expect } from "vitest";
import { parseQueryParams, resolveLocation } from "../../server/config";
import { DEFAULTS } from "../../shared/constants";

describe("parseQueryParams", () => {
  it("returns defaults when no params given", () => {
    const params = new URLSearchParams();
    const config = parseQueryParams(params);

    expect(config.windMin).toBe(DEFAULTS.windMin);
    expect(config.windMax).toBe(DEFAULTS.windMax);
    expect(config.minSessionHours).toBe(DEFAULTS.minSessionHours);
    expect(config.model).toBe(DEFAULTS.model);
    expect(config.location).toBe("beit-yanai");
  });

  it("overrides windMin from URL param", () => {
    const params = new URLSearchParams("windMin=15");
    const config = parseQueryParams(params);

    expect(config.windMin).toBe(15);
  });

  it("rejects unknown location", () => {
    const params = new URLSearchParams("location=atlantis");

    expect(() => parseQueryParams(params)).toThrow(/Unknown location.*"atlantis"/);
  });
});

describe("resolveLocation", () => {
  it("returns correct spotId and tz for 'beit-yanai'", () => {
    const loc = resolveLocation("beit-yanai");

    expect(loc.spotId).toBe("771");
    expect(loc.tz).toBe("Asia/Jerusalem");
  });

  it("throws for unknown location name", () => {
    expect(() => resolveLocation("narnia")).toThrow(/Unknown location.*"narnia"/);
  });
});
