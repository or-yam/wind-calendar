import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Effect } from "effect";
import type { SpotInfo } from "../../server/types/forecast";
import { fetchWindData } from "../../server/windguru/api";
import { buildMockAPIRoot, goodWindSpeeds, realisticHours } from "../helpers/windguru-mocks";
import { captureLogs } from "../helpers/capture-logs";

function buildSpotInfo(models: number[]): SpotInfo {
  return {
    tabs: [
      {
        id_spot: "771",
        lat: 32.38,
        lon: 34.87,
        id_model: 3,
        model_period: 3,
        options: {
          wj: "",
          tj: "",
          waj: "",
          tij: "",
          odh: 0,
          doh: 0,
          fhours: 0,
          limit1: 0,
          limit2: 0,
          limit3: 0,
          tlimit: 0,
          vt: "",
          wrapnew: undefined,
          show_flhgt_opt: 0,
          map_open_fn: "",
          params: [],
          var_map: undefined,
          tide: { style: "", min: 0 },
        },
        id_model_arr: models.map((id) => ({
          id_model: id,
          rundef: `run${id}`,
          period: 3,
          initstr: "",
          cachefix: `cachefix${id}`,
        })),
        share: false,
      },
    ],
    spots: {
      "771": {
        id_spot: "771",
        id_user: "1",
        spotname: "Beit Yanai",
        country: "Israel",
        id_country: 1,
        lat: 32.38,
        lon: 34.87,
        alt: 0,
        tz: "Asia/Jerusalem",
        tzid: "Asia/Jerusalem",
        gmt_hour_offset: 2,
        sunrise: "06:00",
        sunset: "19:00",
        sst: 20,
        models,
        tides: "",
        tide: {} as any,
      },
    },
    tabs_hidden: [],
    message: "",
  };
}

const windForecast = () => buildMockAPIRoot(goodWindSpeeds, realisticHours);
const waveForecast = () => {
  const base = windForecast();
  return { ...base, fcst: { ...base.fcst, HTSGW: goodWindSpeeds.map(() => 1.5) } } as any;
};

let originalFetch: typeof globalThis.fetch;

function installFetchMock(forecastResponses: Record<number, Response> = {}) {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = new URL(input.toString());
    const q = url.searchParams.get("q");

    if (q === "forecast_spot") {
      return new Response(JSON.stringify(buildSpotInfo([1, 3, 84])));
    }

    if (q === "forecast") {
      const modelId = Number(url.searchParams.get("id_model"));
      const custom = forecastResponses[modelId];
      if (custom) return custom;

      return new Response(JSON.stringify(modelId === 84 ? waveForecast() : windForecast()));
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };
}

describe("fetchWindData", () => {
  beforeEach(() => {
    installFetchMock();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("falls back to GFS (model 3) when the primary model fails", async () => {
    const { log, layer } = captureLogs();
    installFetchMock({
      1: new Response("upstream down", { status: 500, statusText: "Internal Server Error" }),
    });

    const result = await Effect.runPromise(fetchWindData("771", 1).pipe(Effect.provide(layer)));

    expect(result.windData).toHaveLength(goodWindSpeeds.length);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        logLevel: "Warn",
        message: ["provider_fallback"],
      }),
    );
  });

  it("treats a wave model failure as non-fatal", async () => {
    const { log, layer } = captureLogs();
    installFetchMock({
      84: new Response("wave down", { status: 500, statusText: "Internal Server Error" }),
    });

    const result = await Effect.runPromise(fetchWindData("771", 3).pipe(Effect.provide(layer)));

    expect(result.windData).toHaveLength(goodWindSpeeds.length);
    expect(result.windData.every((condition) => condition.waveHeight === null)).toBe(true);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        logLevel: "Warn",
        message: ["wave_data_unavailable"],
      }),
    );
  });

  it("merges wave data when the wave model succeeds", async () => {
    const result = await Effect.runPromise(fetchWindData("771", 3));

    expect(result.windData.every((condition) => condition.waveHeight === 1.5)).toBe(true);
  });

  it("surfaces the fallback error when both the primary and GFS models fail", async () => {
    const { log, layer } = captureLogs();
    installFetchMock({
      1: new Response("primary down", { status: 500, statusText: "Internal Server Error" }),
      3: new Response("gfs down", { status: 500, statusText: "Internal Server Error" }),
    });

    await expect(
      Effect.runPromise(fetchWindData("771", 1).pipe(Effect.provide(layer))),
    ).rejects.toThrow(/API request failed: 500/);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        logLevel: "Warn",
        message: ["provider_fallback"],
      }),
    );
  });

  it("surfaces the original error when GFS itself is requested and fails", async () => {
    installFetchMock({
      3: new Response("gfs down", { status: 500, statusText: "Internal Server Error" }),
    });

    await expect(Effect.runPromise(fetchWindData("771", 3))).rejects.toThrow(
      /API request failed: 500/,
    );
  });
});
