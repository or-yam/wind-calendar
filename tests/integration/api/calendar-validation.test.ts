import { describe, it, expect } from "vitest";
import { parseQueryParams } from "../../../server/config";

describe("Wave parameter validation", () => {
  it("rejects waveHeightMin >= waveHeightMax", () => {
    const params = new URLSearchParams("location=tel-aviv&waveHeightMin=3.0&waveHeightMax=1.0");
    expect(() => parseQueryParams(params)).toThrow("waveHeightMin must be less than waveHeightMax");
  });

  it("rejects negative waveHeightMin", () => {
    const params = new URLSearchParams("location=tel-aviv&waveHeightMin=-1");
    expect(() => parseQueryParams(params)).toThrow("waveHeightMin must be >= 0");
  });

  it("rejects waveHeightMax > 20", () => {
    const params = new URLSearchParams("location=tel-aviv&waveHeightMax=25");
    expect(() => parseQueryParams(params)).toThrow("waveHeightMax must be <= 20");
  });

  it("rejects negative wavePeriodMin", () => {
    const params = new URLSearchParams("location=tel-aviv&wavePeriodMin=-5");
    expect(() => parseQueryParams(params)).toThrow("wavePeriodMin must be >= 0");
  });

  it("rejects invalid waveSource value", () => {
    const params = new URLSearchParams("location=tel-aviv&waveSource=invalid");
    expect(() => parseQueryParams(params)).toThrow(
      'Invalid waveSource: "invalid". Must be "total" or "swell"',
    );
  });

  it("accepts valid waveSource values", () => {
    const totalParams = new URLSearchParams("location=tel-aviv&waveSource=total");
    expect(() => parseQueryParams(totalParams)).not.toThrow();

    const swellParams = new URLSearchParams("location=tel-aviv&waveSource=swell");
    expect(() => parseQueryParams(swellParams)).not.toThrow();
  });

  it("accepts waveHeightMin equal to waveHeightMax - 0.1", () => {
    const params = new URLSearchParams("location=tel-aviv&waveHeightMin=1.9&waveHeightMax=2.0");
    expect(() => parseQueryParams(params)).not.toThrow();
  });

  it("accepts boundary values for wave height", () => {
    const params = new URLSearchParams("location=tel-aviv&waveHeightMin=0&waveHeightMax=20");
    expect(() => parseQueryParams(params)).not.toThrow();
  });

  it("accepts zero wavePeriodMin", () => {
    const params = new URLSearchParams("location=tel-aviv&wavePeriodMin=0");
    expect(() => parseQueryParams(params)).not.toThrow();
  });

  it("accepts waveEnabled boolean", () => {
    const trueParams = new URLSearchParams("location=tel-aviv&waveEnabled=true");
    const falseParams = new URLSearchParams("location=tel-aviv&waveEnabled=false");
    expect(() => parseQueryParams(trueParams)).not.toThrow();
    expect(() => parseQueryParams(falseParams)).not.toThrow();
  });

  it("defaults waveEnabled to false when not provided", () => {
    const params = new URLSearchParams("location=tel-aviv");
    const config = parseQueryParams(params);
    expect(config.waveEnabled).toBe(false);
  });
});
