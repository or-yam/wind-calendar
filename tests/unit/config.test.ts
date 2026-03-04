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
    expect(config.windEnabled).toBe(true);
    expect(config.waveEnabled).toBe(false);
    expect(config.waveSource).toBe("total");
    expect(config.waveHeightMin).toBe(0.5);
    expect(config.waveHeightMax).toBe(5.0);
    expect(config.wavePeriodMin).toBe(8);
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

  // --- New wave param tests ---

  it("parses waveEnabled=true", () => {
    const params = new URLSearchParams("waveEnabled=true");
    const config = parseQueryParams(params);
    expect(config.waveEnabled).toBe(true);
  });

  it("parses waveEnabled=false (default)", () => {
    const params = new URLSearchParams();
    const config = parseQueryParams(params);
    expect(config.waveEnabled).toBe(false);
  });

  it("parses windEnabled=false", () => {
    const params = new URLSearchParams("windEnabled=false");
    const config = parseQueryParams(params);
    expect(config.windEnabled).toBe(false);
  });

  it("parses waveSource=swell", () => {
    const params = new URLSearchParams("waveSource=swell");
    const config = parseQueryParams(params);
    expect(config.waveSource).toBe("swell");
  });

  it("rejects invalid waveSource", () => {
    const params = new URLSearchParams("waveSource=invalid");
    expect(() => parseQueryParams(params)).toThrow(/Invalid waveSource/);
  });

  it("parses waveHeightMin", () => {
    const params = new URLSearchParams("waveHeightMin=1.0");
    const config = parseQueryParams(params);
    expect(config.waveHeightMin).toBe(1.0);
  });

  it("parses waveHeightMax", () => {
    const params = new URLSearchParams("waveHeightMax=3.0");
    const config = parseQueryParams(params);
    expect(config.waveHeightMax).toBe(3.0);
  });

  it("parses wavePeriodMin", () => {
    const params = new URLSearchParams("wavePeriodMin=10");
    const config = parseQueryParams(params);
    expect(config.wavePeriodMin).toBe(10);
  });

  it("rejects waveHeightMin >= waveHeightMax", () => {
    const params = new URLSearchParams("waveHeightMin=5&waveHeightMax=3");
    expect(() => parseQueryParams(params)).toThrow(/waveHeightMin must be less than waveHeightMax/);
  });

  it("rejects waveHeightMax > 20", () => {
    const params = new URLSearchParams("waveHeightMax=25");
    expect(() => parseQueryParams(params)).toThrow(/waveHeightMax must be <= 20/);
  });

  it("rejects negative wavePeriodMin", () => {
    const params = new URLSearchParams("wavePeriodMin=-1");
    expect(() => parseQueryParams(params)).toThrow(/wavePeriodMin must be >= 0/);
  });

  it("surfer preset: windEnabled=false, waveEnabled=true", () => {
    const params = new URLSearchParams(
      "windEnabled=false&waveEnabled=true&waveHeightMin=1&wavePeriodMin=10",
    );
    const config = parseQueryParams(params);
    expect(config.windEnabled).toBe(false);
    expect(config.waveEnabled).toBe(true);
    expect(config.waveHeightMin).toBe(1);
    expect(config.wavePeriodMin).toBe(10);
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
