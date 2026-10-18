import { Schema } from "effect";

export const WindRangeSchema = Schema.Struct({
  windMin: Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(0, { message: "windMin must be >= 0" }),
  ),
  windMax: Schema.Number.check(
    Schema.isLessThanOrEqualTo(200, { message: "windMax must be <= 200" }),
  ),
}).check(
  Schema.makeFilter(
    ({ windMin, windMax }) => windMin < windMax || "windMin must be less than windMax",
  ),
);

export const WaveHeightRangeSchema = Schema.Struct({
  waveHeightMin: Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(0, { message: "waveHeightMin must be >= 0" }),
  ),
  waveHeightMax: Schema.Number.check(
    Schema.isLessThanOrEqualTo(20, { message: "waveHeightMax must be <= 20" }),
  ),
}).check(
  Schema.makeFilter(
    ({ waveHeightMin, waveHeightMax }) =>
      waveHeightMin < waveHeightMax || "waveHeightMin must be less than waveHeightMax",
  ),
);

export const WavePeriodSchema = Schema.Number.check(
  Schema.isGreaterThanOrEqualTo(0, { message: "wavePeriodMin must be >= 0" }),
);
