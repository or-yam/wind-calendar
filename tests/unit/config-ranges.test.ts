import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import {
  WaveHeightRangeSchema,
  WavePeriodSchema,
  WindRangeSchema,
} from "../../server/config-ranges";

describe("finite configuration ranges", () => {
  it.each([NaN, Infinity, -Infinity])("rejects %s in every numeric range field", (value) => {
    expect(Schema.is(WindRangeSchema)({ windMin: value, windMax: 35 })).toBe(false);
    expect(Schema.is(WindRangeSchema)({ windMin: 14, windMax: value })).toBe(false);
    expect(Schema.is(WaveHeightRangeSchema)({ waveHeightMin: value, waveHeightMax: 3 })).toBe(
      false,
    );
    expect(Schema.is(WaveHeightRangeSchema)({ waveHeightMin: 0.5, waveHeightMax: value })).toBe(
      false,
    );
    expect(Schema.is(WavePeriodSchema)(value)).toBe(false);
  });
});
