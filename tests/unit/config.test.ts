import { describe, it, expect } from "vitest";
import { Effect, Result, Schema } from "effect";
import { parseQueryParams, resolveLocation } from "../../server/config";
import { normalizeQueryParams } from "../../server/config-query";
import { parseConfig } from "../../server/utils/api-handler";
import { ConfigError } from "../../server/errors";
import { DEFAULTS } from "../../shared/constants";
import { LOCATIONS } from "../../shared/locations";
import { MODELS } from "../../shared/models";

describe("normalizeQueryParams", () => {
  it("supplies defaults without parsing or validating numbers and enums", () => {
    expect(normalizeQueryParams(new URLSearchParams())).toEqual({
      ...DEFAULTS,
      minSessionHours: "1",
      model: "om_icon",
      windMin: "14",
      windMax: "35",
      waveHeightMin: "0.5",
      waveHeightMax: "3",
      wavePeriodMin: "0",
    });
    expect(normalizeQueryParams(new URLSearchParams("windMin=bad&model=bad"))).toMatchObject({
      windMin: "bad",
      model: "bad",
    });
  });

  it("combines repeated and CSV locations, trims, drops blanks, and dedupes in order", () => {
    const params = new URLSearchParams(
      "locations=tel-aviv,,herzliya&locations=+beit-yanai+,tel-aviv&location=unknown",
    );
    expect(normalizeQueryParams(params).locations).toEqual(["tel-aviv", "herzliya", "beit-yanai"]);
    expect(params.getAll("locations")).toHaveLength(2);
  });

  it.each(["locations=", "locations=,++,&location=tel-aviv", "location=+"])(
    "does not replace explicitly empty locations with defaults: %s",
    (query) => expect(normalizeQueryParams(new URLSearchParams(query)).locations).toEqual([]),
  );

  it("uses only the first legacy location and does not split legacy CSV", () => {
    expect(
      normalizeQueryParams(new URLSearchParams("location=+tel-aviv+&location=herzliya")).locations,
    ).toEqual(["tel-aviv"]);
    expect(
      normalizeQueryParams(new URLSearchParams("location=tel-aviv,herzliya")).locations,
    ).toEqual(["tel-aviv,herzliya"]);
  });

  it("keeps first-value semantics for non-location parameters", () => {
    expect(
      normalizeQueryParams(new URLSearchParams("windMin=15&windMin=bad&model=3&model=bad")),
    ).toMatchObject({ windMin: "15", model: "3" });
  });
});

describe("parseQueryParams", () => {
  it("decodes all defaults to the existing config shape", () => {
    expect(parseQueryParams(new URLSearchParams())).toEqual(DEFAULTS);
  });

  it("decodes mixed repeated/CSV locations after deduplication", () => {
    expect(
      parseQueryParams(
        new URLSearchParams(
          "locations=tel-aviv,herzliya&locations=tel-aviv,beit-yanai&locations=herzliya",
        ),
      ).locations,
    ).toEqual(["tel-aviv", "herzliya", "beit-yanai"]);
  });

  it.each(Object.values(MODELS).map(({ id }) => [String(id), id]))(
    "accepts model %s with its original type",
    (raw, model) =>
      expect(parseQueryParams(new URLSearchParams({ model: String(raw) })).model).toBe(model),
  );

  it.each(["03", "3.0", "3e0", "0x3", " 3 "])("preserves Number model coercion: %s", (model) => {
    expect(parseQueryParams(new URLSearchParams({ model })).model).toBe(3);
  });

  it.each(["15knots", " 15.5 ", "15e0", "0x10"])("preserves parseFloat coercion: %s", (windMin) => {
    expect(parseQueryParams(new URLSearchParams({ windMin })).windMin).toBe(parseFloat(windMin));
  });

  it.each(["false", "TRUE", "1", "yes", ""])("only treats literal true as enabled: %s", (value) => {
    expect(
      parseQueryParams(new URLSearchParams({ windEnabled: value, waveEnabled: value })),
    ).toMatchObject({ windEnabled: false, waveEnabled: false });
  });

  it("preserves both filters disabled and unbounded positive wave periods", () => {
    expect(
      parseQueryParams(
        new URLSearchParams("windEnabled=false&waveEnabled=false&wavePeriodMin=Infinity"),
      ),
    ).toMatchObject({ windEnabled: false, waveEnabled: false, wavePeriodMin: Infinity });
  });

  it.each([0, 24])("accepts boundary minSessionHours=%s", (hours) => {
    expect(
      parseQueryParams(new URLSearchParams({ minSessionHours: String(hours) })).minSessionHours,
    ).toBe(hours);
  });

  it("accepts boundary wind and wave ranges", () => {
    expect(
      parseQueryParams(
        new URLSearchParams(
          "windMin=0&windMax=200&waveHeightMin=0&waveHeightMax=20&wavePeriodMin=0",
        ),
      ),
    ).toMatchObject({
      windMin: 0,
      windMax: 200,
      waveHeightMin: 0,
      waveHeightMax: 20,
      wavePeriodMin: 0,
    });
  });

  const unknownLocation = (name: string) =>
    `Unknown location: "${name}". Valid locations: ${Object.keys(LOCATIONS).join(", ")}`;
  const invalidModel = (model: string) =>
    `Invalid model: "${model}". Valid models: ${Object.keys(MODELS).join(", ")}`;

  it.each([
    ["locations=", "At least one location is required"],
    ["locations=tel-aviv,herzliya,beit-yanai,bat-galim", "A maximum of 3 locations is allowed"],
    ["locations=unknown,other", unknownLocation("unknown")],
    ["location=tel-aviv,herzliya", unknownLocation("tel-aviv,herzliya")],
    ["minSessionHours=-1", "minSessionHours must be between 0 and 24"],
    ["minSessionHours=25", "minSessionHours must be between 0 and 24"],
    ["minSessionHours=Infinity", "minSessionHours must be between 0 and 24"],
    ["model=999", invalidModel("999")],
    ["model=bad", invalidModel("bad")],
    ["model=3junk", invalidModel("3junk")],
    ["model=3.5", invalidModel("3.5")],
    ["model=", invalidModel("")],
    ["windMin=-1", "windMin must be >= 0"],
    ["windMax=201", "windMax must be <= 200"],
    ["windMax=Infinity", "windMax must be <= 200"],
    ["windMin=35", "windMin must be less than windMax"],
    ["windMin=40", "windMin must be less than windMax"],
    ["windMax=-1", "windMin must be less than windMax"],
    ["waveSource=bad", 'Invalid waveSource: "bad". Must be "total" or "swell"'],
    ["waveSource=", 'Invalid waveSource: "". Must be "total" or "swell"'],
    ["waveHeightMin=-1", "waveHeightMin must be >= 0"],
    ["waveHeightMax=21", "waveHeightMax must be <= 20"],
    ["waveHeightMin=3", "waveHeightMin must be less than waveHeightMax"],
    ["waveHeightMax=-1", "waveHeightMin must be less than waveHeightMax"],
    ["wavePeriodMin=-1", "wavePeriodMin must be >= 0"],
    ["wavePeriodMin=-Infinity", "wavePeriodMin must be >= 0"],
    ["windEnabled=false&windMin=-1", "windMin must be >= 0"],
    ["waveEnabled=false&waveHeightMin=-1", "waveHeightMin must be >= 0"],
  ])("preserves exact validation message for %s", (query, message) => {
    expect(() => parseQueryParams(new URLSearchParams(query))).toThrow(new Error(message));
  });

  it.each([
    "minSessionHours",
    "windMin",
    "windMax",
    "waveHeightMin",
    "waveHeightMax",
    "wavePeriodMin",
  ])("rejects invalid numeric %s with its raw value in the error", (key) => {
    for (const raw of ["", " ", "bad", "NaN"]) {
      expect(() => parseQueryParams(new URLSearchParams({ [key]: raw }))).toThrow(
        new Error(`Invalid ${key}: "${raw}" is not a number`),
      );
    }
  });

  it.each([
    ["location=unknown&minSessionHours=bad", unknownLocation("unknown")],
    ["locations=unknown,a,b,c", "A maximum of 3 locations is allowed"],
    ["minSessionHours=25&model=bad", "minSessionHours must be between 0 and 24"],
    ["model=bad&windMin=bad", invalidModel("bad")],
    ["windMin=-1&windMax=bad", 'Invalid windMax: "bad" is not a number'],
    ["windMin=bad&windMax=bad", 'Invalid windMin: "bad" is not a number'],
    ["windMin=-1&windMax=201", "windMin must be >= 0"],
    ["windMax=201&waveSource=bad", "windMax must be <= 200"],
    ["waveSource=bad&waveHeightMin=bad", 'Invalid waveSource: "bad". Must be "total" or "swell"'],
    ["waveHeightMin=-1&waveHeightMax=bad", 'Invalid waveHeightMax: "bad" is not a number'],
    ["waveHeightMin=-1&wavePeriodMin=bad", 'Invalid wavePeriodMin: "bad" is not a number'],
    ["waveHeightMin=-1&waveHeightMax=21", "waveHeightMin must be >= 0"],
    ["waveHeightMin=30&waveHeightMax=21", "waveHeightMax must be <= 20"],
    ["waveHeightMin=3&wavePeriodMin=-1", "waveHeightMin must be less than waveHeightMax"],
  ])("preserves first-error precedence for %s", (query, message) => {
    expect(() => parseQueryParams(new URLSearchParams(query))).toThrow(new Error(message));
  });

  it("retains the SchemaError as the synchronous error cause", () => {
    try {
      parseQueryParams(new URLSearchParams("windMin=bad"));
      expect.fail("Expected invalid config to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(Schema.isSchemaError((error as Error).cause)).toBe(true);
    }
  });

  it("keeps schema failures in parseConfig's typed ConfigError channel", () => {
    const result = Effect.runSync(Effect.result(parseConfig({ windMin: "bad" })));
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toBeInstanceOf(ConfigError);
      expect(result.failure.message).toBe('Invalid windMin: "bad" is not a number');
    }
  });

  it("preserves array query normalization in the effect boundary", () => {
    const config = Effect.runSync(
      parseConfig({ locations: ["tel-aviv,herzliya", "beit-yanai,tel-aviv"] }),
    );
    expect(config.locations).toEqual(["tel-aviv", "herzliya", "beit-yanai"]);
  });

  it("returns defaults when no params given", () => {
    const params = new URLSearchParams();
    const config = parseQueryParams(params);

    expect(config.windMin).toBe(DEFAULTS.windMin);
    expect(config.windMax).toBe(DEFAULTS.windMax);
    expect(config.minSessionHours).toBe(DEFAULTS.minSessionHours);
    expect(config.model).toBe(DEFAULTS.model);
    expect(config.locations).toEqual(["beit-yanai"]);
    expect(config.windEnabled).toBe(true);
    expect(config.waveEnabled).toBe(false);
    expect(config.waveSource).toBe("total");
    expect(config.waveHeightMin).toBe(0.5);
    expect(config.waveHeightMax).toBe(3.0);
    expect(config.wavePeriodMin).toBe(0);
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

  it("parses up to three comma-separated locations", () => {
    const config = parseQueryParams(new URLSearchParams("locations=tel-aviv,herzliya,beit-yanai"));
    expect(config.locations).toEqual(["tel-aviv", "herzliya", "beit-yanai"]);
  });

  it("keeps legacy location URLs working", () => {
    const config = parseQueryParams(new URLSearchParams("location=tel-aviv"));
    expect(config.locations).toEqual(["tel-aviv"]);
  });

  it("rejects more than three locations", () => {
    const params = new URLSearchParams("locations=tel-aviv,herzliya,beit-yanai,bat-galim");
    expect(() => parseQueryParams(params)).toThrow("A maximum of 3 locations is allowed");
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
