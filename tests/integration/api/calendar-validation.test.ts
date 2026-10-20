import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseQueryParams } from "../../../server/config";
import calendarHandler from "../../../server/api/calendar";
import forecastHandler from "../../../server/api/forecast";
import { resolveForecastData } from "../../../server/utils/api-handler";
import { __resetForTesting } from "../../../server/utils/rate-limit";
import { callHandler } from "../../helpers/nitro-mocks";
import { LOCATIONS } from "../../../shared/locations";
import { MODELS } from "../../../shared/models";

vi.mock("../../../server/utils/api-handler", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../server/utils/api-handler")>()),
  resolveForecastData: vi.fn(),
}));

describe.each([
  ["calendar", calendarHandler],
  ["forecast", forecastHandler],
] as const)("%s handler query validation", (endpoint, handler) => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetForTesting();
  });

  it.each([
    ["locations=", "At least one location is required"],
    [
      "locations=tel-aviv,herzliya&locations=beit-yanai,bat-galim",
      "A maximum of 3 locations is allowed",
    ],
    [
      "locations=tel-aviv&locations=unknown",
      `Unknown location: "unknown". Valid locations: ${Object.keys(LOCATIONS).join(", ")}`,
    ],
    ["minSessionHours=bad", 'Invalid minSessionHours: "bad" is not a number'],
    ["minSessionHours=25", "minSessionHours must be between 0 and 24"],
    ["model=bad", `Invalid model: "bad". Valid models: ${Object.keys(MODELS).join(", ")}`],
    ["windMin=bad", 'Invalid windMin: "bad" is not a number'],
    ["windMin=-1", "windMin must be >= 0"],
    ["windMax=201", "windMax must be <= 200"],
    ["windMin=35", "windMin must be less than windMax"],
    ["waveSource=bad", 'Invalid waveSource: "bad". Must be "total" or "swell"'],
    ["waveHeightMin=bad", 'Invalid waveHeightMin: "bad" is not a number'],
    ["waveHeightMin=-1", "waveHeightMin must be >= 0"],
    ["waveHeightMax=21", "waveHeightMax must be <= 20"],
    ["waveHeightMin=3", "waveHeightMin must be less than waveHeightMax"],
    ["wavePeriodMin=-1", "wavePeriodMin must be >= 0"],
    ["waveEnabled=false&wavePeriodMin=-1", "wavePeriodMin must be >= 0"],
    ["windMin=-1&windMax=bad", 'Invalid windMax: "bad" is not a number'],
  ])("returns 400 with the existing error message for %s", async (query, message) => {
    const response = await callHandler(handler, `/api/${endpoint}?${query}`);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).data).toEqual({ error: message });
    expect(resolveForecastData).not.toHaveBeenCalled();
  });
});

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
