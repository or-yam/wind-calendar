import { Result, Schema, SchemaIssue, SchemaTransformation } from "effect";
import { LOCATIONS } from "../shared/locations.js";
import { MODELS, isValidModelId, type ModelId } from "../shared/models.js";

const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1();

export function decodeConfigValue<S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  input: unknown,
): S["Type"] {
  const result = Schema.decodeUnknownResult(schema)(input);
  if (Result.isFailure(result)) {
    throw new Error(formatIssues(result.failure.issue).issues[0].message, {
      cause: result.failure,
    });
  }
  return result.success;
}

export const LocationsSchema = Schema.Array(Schema.String)
  .check(
    Schema.isMinLength(1, { message: "At least one location is required" }),
    Schema.isMaxLength(3, { message: "A maximum of 3 locations is allowed" }),
  )
  .pipe(
    Schema.decodeTo(
      Schema.Array(
        Schema.String.check(
          Schema.makeFilter(
            (name) =>
              name in LOCATIONS ||
              `Unknown location: "${name}". Valid locations: ${Object.keys(LOCATIONS).join(", ")}`,
          ),
        ),
      ),
    ),
  );

function floatParam(key: string) {
  return Schema.String.check(
    Schema.makeFilter(
      (raw) => !Number.isNaN(parseFloat(raw)) || `Invalid ${key}: "${raw}" is not a number`,
    ),
  ).pipe(
    Schema.decodeTo(
      // oxlint-disable-next-line effecttsgo/schema-number -- Range validation follows parsing and preserves error precedence.
      Schema.Number,
      SchemaTransformation.transform({ decode: parseFloat, encode: String }),
    ),
  );
}

export const MinSessionHoursSchema = floatParam("minSessionHours").check(
  Schema.isBetween(
    { minimum: 0, maximum: 24 },
    { message: "minSessionHours must be between 0 and 24" },
  ),
);

const ModelIdSchema = Schema.declare<ModelId>(
  (input): input is ModelId =>
    (typeof input === "string" || typeof input === "number") && isValidModelId(input),
);
const parseModel = (raw: string) => (Number.isNaN(Number(raw)) ? raw : Number(raw));
export const ModelSchema = Schema.String.check(
  Schema.makeFilter(
    (raw) =>
      Schema.is(ModelIdSchema)(parseModel(raw)) ||
      `Invalid model: "${raw}". Valid models: ${Object.keys(MODELS).join(", ")}`,
  ),
).pipe(
  Schema.decodeTo(
    // oxlint-disable-next-line effecttsgo/schema-number -- ModelIdSchema validates supported numeric IDs.
    Schema.Union([Schema.String, Schema.Number]),
    SchemaTransformation.transform({ decode: parseModel, encode: String }),
  ),
  Schema.decodeTo(ModelIdSchema),
);

const WaveSource = Schema.Literals(["total", "swell"]);
export const WaveSourceSchema = Schema.String.check(
  Schema.makeFilter(
    (raw) =>
      Schema.is(WaveSource)(raw) || `Invalid waveSource: "${raw}". Must be "total" or "swell"`,
  ),
).pipe(Schema.decodeTo(WaveSource));

export const WindNumbersSchema = Schema.Struct({
  windMin: floatParam("windMin"),
  windMax: floatParam("windMax"),
});

export const WaveNumbersSchema = Schema.Struct({
  waveHeightMin: floatParam("waveHeightMin"),
  waveHeightMax: floatParam("waveHeightMax"),
  wavePeriodMin: floatParam("wavePeriodMin"),
});
