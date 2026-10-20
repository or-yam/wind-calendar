// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import handler from "../../../server/api/forecast";
import { __resetForTesting } from "../../../server/utils/rate-limit";
import type { ForecastResponse } from "../../../shared/forecast-types";
import { callHandler } from "../../helpers/nitro-mocks";
import { mockExternalFetch, providerResponse } from "../../helpers/provider-http";
import { utcTime } from "../../helpers/provider-hours";

const providers = [
  { provider: "openmeteo", query: "", model: "om_gfs" },
  { provider: "windguru", query: "model=45", model: 45 },
] as const;

describe("forecast HTTP happy flows (real Effect pipeline)", () => {
  let http: ReturnType<typeof mockExternalFetch>;
  beforeEach(() => {
    __resetForTesting();
    http = mockExternalFetch((url) => providerResponse(url));
  });
  afterEach(() => {
    http.spy.mockRestore();
    __resetForTesting();
  });

  it.each(providers)(
    "$provider returns exact sessions, merged hourly data and metadata",
    async ({ provider, query, model }) => {
      const before = Date.now();
      const res = await callHandler(handler, `/api/forecast?${query}`);
      expect(res.statusCode).toBe(200);
      expect(res.headers).toMatchObject({
        "content-type": "application/json; charset=utf-8",
        "cache-control":
          "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
        "x-data-source": provider,
      });
      expect(res.headers["x-fallback-used"]).toBeUndefined();
      const body = JSON.parse(res.body) as ForecastResponse;
      expect(body.meta).toEqual({
        location: "beit-yanai",
        locations: ["beit-yanai"],
        model,
        dataSource: provider,
        dataSources: { "beit-yanai": provider },
        generatedAt: expect.any(String),
      });
      expect(Date.parse(body.meta.generatedAt)).toBeGreaterThanOrEqual(before);
      expect(Date.parse(body.meta.generatedAt)).toBeLessThanOrEqual(Date.now());
      const marine = provider === "openmeteo";
      expect(body.sessions).toHaveLength(2);
      expect(body.sessions[0]).toEqual({
        location: { id: "beit-yanai", label: "Beit Yanai" },
        start: utcTime(3),
        end: utcTime(6),
        matchType: "wind",
        wind: { min: 14, max: 20, gustMax: 27, direction: "W" },
        wave: { avgHeight: 1.6, avgPeriod: marine ? 8 : 0, direction: marine ? "SW" : "N" },
        swell: { avgHeight: marine ? 0.8 : 0, avgPeriod: marine ? 12 : 0 },
        hourly: [
          {
            time: utcTime(3),
            windSpeed: 14,
            windGusts: 21,
            windDirection: "W",
            windDirectionDeg: 270,
            waveHeight: 1.2,
            wavePeriod: marine ? 6 : null,
            waveDirection: marine ? "SW" : null,
            swellHeight: marine ? 0.4 : null,
            swellPeriod: marine ? 10 : null,
          },
          {
            time: utcTime(4),
            windSpeed: 18,
            windGusts: 25,
            windDirection: "NW",
            windDirectionDeg: 315,
            waveHeight: 1.6,
            wavePeriod: marine ? 8 : null,
            waveDirection: marine ? "SW" : null,
            swellHeight: marine ? 0.8 : null,
            swellPeriod: marine ? 12 : null,
          },
          {
            time: utcTime(5),
            windSpeed: 20,
            windGusts: 27,
            windDirection: "W",
            windDirectionDeg: 270,
            waveHeight: 2,
            wavePeriod: marine ? 10 : null,
            waveDirection: marine ? "SW" : null,
            swellHeight: marine ? 1.2 : null,
            swellPeriod: marine ? 14 : null,
          },
        ],
      });
      expect(body.sessions[1]).toMatchObject({
        start: utcTime(10),
        end: utcTime(12),
        matchType: "wind",
        wind: { min: 16, max: 17, gustMax: 24, direction: "W" },
        wave: { avgHeight: 0.3 },
      });
      expect(body.sessions[1].hourly.map((h) => [h.time, h.windSpeed])).toEqual([
        [utcTime(10), 16],
        [utcTime(11), 17],
      ]);
    },
  );

  it.each([
    [3, "windguru", null],
    [45, "windguru", null],
    [59, "windguru", null],
    [117, "windguru", null],
    ["om_gfs", "openmeteo", "gfs_global"],
    ["om_icon", "openmeteo", "icon_global"],
    ["om_gdps", "openmeteo", "gem_global"],
    ["om_ifs", "openmeteo", "ecmwf_ifs025"],
  ] as const)(
    "passes model %s to upstream without accidental GFS fallback",
    async (model, provider, slug) => {
      const res = await callHandler(handler, `/api/forecast?model=${model}`);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as ForecastResponse;
      expect(body.meta.model).toBe(model);
      expect(body.meta.dataSource).toBe(provider);
      expect(res.headers["x-fallback-used"]).toBeUndefined();
      expect(body.sessions.map((s) => [s.start, s.end])).toEqual([
        [utcTime(3), utcTime(6)],
        [utcTime(10), utcTime(12)],
      ]);
      if (provider === "windguru") {
        expect(http.requests.every((url) => url.hostname === "www.windguru.cz")).toBe(true);
        expect(http.requests.some((url) => url.searchParams.get("q") === "forecast_spot")).toBe(
          true,
        );
        const forecasts = http.requests.filter((url) => url.searchParams.get("q") === "forecast");
        expect(
          forecasts.map((url) => Number(url.searchParams.get("id_model"))).sort((a, b) => a - b),
        ).toEqual([Number(model), 84].sort((a, b) => a - b));
        expect(http.requests.every((url) => url.searchParams.get("id_spot") === "771")).toBe(true);
      } else {
        expect(http.requests).toHaveLength(2);
        const forecast = http.requests.find((url) => url.hostname === "api.open-meteo.com")!;
        const wave = http.requests.find((url) => url.hostname === "marine-api.open-meteo.com")!;
        expect(Object.fromEntries(forecast.searchParams)).toEqual({
          latitude: "32.38",
          longitude: "34.87",
          timezone: "Asia/Jerusalem",
          forecast_days: "7",
          models: slug,
          daily: "sunrise,sunset",
          wind_speed_unit: "kn",
          hourly: "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        });
        expect(wave.searchParams.get("hourly")).toBe(
          "wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction",
        );
        expect(wave.searchParams.get("timezone")).toBe("Asia/Jerusalem");
      }
    },
  );

  describe.each(providers)("$provider URL filters", ({ query }) => {
    it.each([
      ["windMin=18&windMax=21", [[4, 6]]],
      [
        "windMin=14&windMax=18",
        [
          [3, 5],
          [10, 12],
        ],
      ],
      ["windMin=21", []],
      [
        "minSessionHours=1",
        [
          [3, 6],
          [10, 12],
          [15, 16],
        ],
      ],
      ["minSessionHours=3", [[3, 6]]],
      ["windEnabled=false&waveEnabled=false", []],
      ["windEnabled=false&waveEnabled=true&waveHeightMin=1.1&waveHeightMax=1.7", [[3, 5]]],
    ] as const)("applies %s, including daylight and duration limits", async (filter, expected) => {
      const res = await callHandler(handler, `/api/forecast?${query}&${filter}`);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as ForecastResponse;
      expect(body.sessions.map((s) => [s.start, s.end])).toEqual(
        expected.map(([start, end]) => [utcTime(start), utcTime(end)]),
      );
      if (filter.startsWith("windEnabled=false&waveEnabled=true")) {
        expect(body.sessions[0].matchType).toBe("wave");
        expect(body.sessions[0].hourly.map((h) => h.waveHeight)).toEqual([1.2, 1.6]);
      }
    });

    it("splits wind-only and both-matching sessions at exact boundaries", async () => {
      const res = await callHandler(
        handler,
        `/api/forecast?${query}&waveEnabled=true&waveHeightMin=1.1&waveHeightMax=1.7`,
      );
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as ForecastResponse;
      expect(body.sessions.map((s) => [s.start, s.end, s.matchType])).toEqual([
        [utcTime(3), utcTime(5), "both"],
        [utcTime(10), utcTime(12), "wind"],
      ]);
    });
  });

  it.each([
    ["total", "waveHeightMin=1.1&waveHeightMax=2.1&wavePeriodMin=8"],
    ["swell", "waveHeightMin=0.3&waveHeightMax=1.3&wavePeriodMin=12"],
  ])(
    "filters Open-Meteo %s height and period from the real marine merge",
    async (source, filter) => {
      const res = await callHandler(
        handler,
        `/api/forecast?model=om_icon&windEnabled=false&waveEnabled=true&waveSource=${source}&${filter}`,
      );
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as ForecastResponse;
      expect(body.sessions).toHaveLength(1);
      expect(body.sessions[0]).toMatchObject({
        start: utcTime(4),
        end: utcTime(6),
        matchType: "wave",
        wave: { avgHeight: 1.8, avgPeriod: 9, direction: "SW" },
        swell: { avgHeight: 1, avgPeriod: 13 },
      });
      expect(body.sessions[0].hourly.map((h) => [h.time, h.waveHeight, h.swellHeight])).toEqual([
        [utcTime(4), 1.6, 0.8],
        [utcTime(5), 2, 1.2],
      ]);
    },
  );
});
