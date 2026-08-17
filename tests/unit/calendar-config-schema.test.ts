import { describe, expect, it } from "vitest";
import { calendarConfigSchema } from "../../shared/calendar-config-schema";
import { DEFAULTS } from "../../shared/constants";

const validConfig = {
  ...DEFAULTS,
  locations: [...DEFAULTS.locations],
  windDirections: [...DEFAULTS.windDirections],
  model: "om_gfs",
};

describe("calendarConfigSchema", () => {
  it("accepts a complete supported configuration", () => {
    expect(calendarConfigSchema.parse(validConfig)).toEqual(validConfig);
  });

  it("rejects unknown fields and locations", () => {
    expect(() =>
      calendarConfigSchema.parse({ ...validConfig, locations: ["unknown"], extra: true }),
    ).toThrow();
  });

  it("rejects invalid ranges and disabled filters", () => {
    expect(() => calendarConfigSchema.parse({ ...validConfig, windMin: 30, windMax: 20 })).toThrow(
      "windMin must be less than windMax",
    );
    expect(() =>
      calendarConfigSchema.parse({ ...validConfig, windEnabled: false, waveEnabled: false }),
    ).toThrow("At least one of wind or waves must be enabled");
  });

  it("requires unique supported wind directions", () => {
    expect(() =>
      calendarConfigSchema.parse({ ...validConfig, windDirections: ["N", "N"] }),
    ).toThrow("windDirections must not contain duplicates");
    expect(() => calendarConfigSchema.parse({ ...validConfig, windDirections: [] })).toThrow();
    expect(() =>
      calendarConfigSchema.parse({ ...validConfig, windDirections: ["NORTH"] }),
    ).toThrow();
  });

  it("canonicalizes wind direction order", () => {
    expect(
      calendarConfigSchema.parse({ ...validConfig, windDirections: ["NW", "N", "NE"] })
        .windDirections,
    ).toEqual(["N", "NE", "NW"]);
  });
});
