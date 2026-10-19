import { Schema } from "effect";

export const WindRangeSchema = Schema.Struct({
  // oxlint-disable-next-line effecttsgo/schema-number -- Preserve existing range checks and error messages.
  windMin: Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(0, { message: "windMin must be >= 0" }),
  ),
  // oxlint-disable-next-line effecttsgo/schema-number -- Preserve existing range checks and error messages.
  windMax: Schema.Number.check(
    Schema.isLessThanOrEqualTo(200, { message: "windMax must be <= 200" }),
  ),
}).check(
  Schema.makeFilter(
    ({ windMin, windMax }) => windMin < windMax || "windMin must be less than windMax",
  ),
);

export const WaveHeightRangeSchema = Schema.Struct({
  // oxlint-disable-next-line effecttsgo/schema-number -- Preserve existing range checks and error messages.
  waveHeightMin: Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(0, { message: "waveHeightMin must be >= 0" }),
  ),
  // oxlint-disable-next-line effecttsgo/schema-number -- Preserve existing range checks and error messages.
  waveHeightMax: Schema.Number.check(
    Schema.isLessThanOrEqualTo(20, { message: "waveHeightMax must be <= 20" }),
  ),
}).check(
  Schema.makeFilter(
    ({ waveHeightMin, waveHeightMax }) =>
      waveHeightMin < waveHeightMax || "waveHeightMin must be less than waveHeightMax",
  ),
);

// oxlint-disable-next-line effecttsgo/schema-number -- Positive Infinity remains accepted for compatibility.
export const WavePeriodSchema = Schema.Number.check(
  Schema.isGreaterThanOrEqualTo(0, { message: "wavePeriodMin must be >= 0" }),
);
