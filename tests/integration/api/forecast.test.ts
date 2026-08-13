import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ForecastResponse } from "../../../shared/forecast-types";
import { callHandler } from "../../helpers/nitro-mocks";
import { mockSpotInfo, mockAPIRoot, mockWindData } from "../../helpers/windguru-mocks";

vi.mock("../../../server/windguru/forecast", () => ({
  getForecast: vi.fn().mockImplementation(async (locationCode: string, modelId: number) => {
    if (modelId === 84) {
      const error = new Error("Wave model error");
      (error as any).status = 500;
      throw error;
    }
    return mockAPIRoot;
  }),
  fetchSpotInfo: vi.fn().mockResolvedValue(mockSpotInfo),
}));

vi.mock("../../../server/windguru/api", () => ({
  fetchWindData: vi.fn().mockImplementation(async (_locationCode: string, _modelId: number) => {
    return {
      windData: mockWindData.fcst.WINDSPD.map((windSpeed, i) => ({
        date: new Date((mockWindData.fcst.initstamp + mockWindData.fcst.hours[i] * 3600) * 1000),
        windSpeed,
        windGusts: mockWindData.fcst.GUST?.[i] ?? null,
        windDirection: mockWindData.fcst.WINDDIR?.[i] ?? null,
        waveHeight: null,
        wavePeriod: null,
        waveDirection: null,
        swellHeight: null,
        swellPeriod: null,
        swellDirection: null,
      })),
      sunrise: mockWindData.sunrise,
      sunset: mockWindData.sunset,
    };
  }),
}));

vi.mock("../../../server/utils/api-handler", async () => {
  const actual = await vi.importActual("../../../server/utils/api-handler");
  return {
    ...actual,
    resolveForecastData: vi.fn().mockImplementation(async () => {
      return {
        success: true,
        fetchResult: {
          windData: mockWindData.fcst.WINDSPD.map((windSpeed, i) => ({
            date: new Date(
              (mockWindData.fcst.initstamp + mockWindData.fcst.hours[i] * 3600) * 1000,
            ),
            windSpeed,
            windGusts: mockWindData.fcst.GUST?.[i] ?? null,
            windDirection: mockWindData.fcst.WINDDIR?.[i] ?? null,
            waveHeight: null,
            wavePeriod: null,
            waveDirection: null,
            swellHeight: null,
            swellPeriod: null,
            swellDirection: null,
          })),
          sunrise: "06:00",
          sunset: "19:00",
        },
        dataSource: "windguru",
        fallbackUsed: false,
      };
    }),
  };
});

import handler from "../../../server/api/forecast";

describe("forecast API handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("full pipeline: returns JSON forecast with sessions", async () => {
    const res = await callHandler(handler, "/api/forecast");

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(res.headers["cache-control"]).toBe(
      "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
    );
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);

    const body = JSON.parse(res.body) as ForecastResponse;
    expect(body.meta).toBeDefined();
    expect(body.meta.location).toBe("beit-yanai");
    expect(body.meta.locations).toEqual(["beit-yanai"]);
    expect(body.meta.dataSource).toBe("windguru");
    expect(body.sessions).toBeInstanceOf(Array);
  });

  it("unknown location returns 400", async () => {
    const res = await callHandler(handler, "/api/forecast?location=unknown");

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.data?.error).toContain("Unknown location");
  });

  it("query param overrides work", async () => {
    const res = await callHandler(handler, "/api/forecast?windMin=20");

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as ForecastResponse;
    expect(body.sessions).toHaveLength(0);
  });

  it("returns multi-location metadata and only one overlapping winner", async () => {
    const res = await callHandler(handler, "/api/forecast?locations=beit-yanai,tel-aviv");

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as ForecastResponse;
    expect(body.meta.locations).toEqual(["beit-yanai", "tel-aviv"]);
    expect(body.meta.dataSources).toEqual({
      "beit-yanai": "windguru",
      "tel-aviv": "windguru",
    });
    expect(new Set(body.sessions.map((session) => session.location.id))).toEqual(
      new Set(["beit-yanai"]),
    );
  });

  it("accepts repeated locations parameters", async () => {
    const res = await callHandler(handler, "/api/forecast?locations=beit-yanai&locations=tel-aviv");

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as ForecastResponse;
    expect(body.meta.locations).toEqual(["beit-yanai", "tel-aviv"]);
  });

  it("sessions contain wind and wave data", async () => {
    const res = await callHandler(handler, "/api/forecast");

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as ForecastResponse;
    expect(body.sessions.length).toBeGreaterThan(0);

    const session = body.sessions[0];
    expect(session.location).toEqual({ id: "beit-yanai", label: "Beit Yanai" });
    expect(session.start).toBeDefined();
    expect(session.end).toBeDefined();
    expect(session.wind).toBeDefined();
    expect(session.wind.min).toBeGreaterThan(0);
    expect(session.wind.max).toBeGreaterThanOrEqual(session.wind.min);
    expect(session.hourly).toBeInstanceOf(Array);
    expect(session.hourly.length).toBeGreaterThan(0);
  });

  it("wave model failure is non-fatal — still returns forecast", async () => {
    const res = await callHandler(handler, "/api/forecast");

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as ForecastResponse;
    expect(body.sessions).toBeDefined();
  });

  it("X-Data-Source header is set", async () => {
    const res = await callHandler(handler, "/api/forecast");

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-data-source"]).toBe("windguru");
  });

  it("hourly conditions include all expected fields", async () => {
    const res = await callHandler(handler, "/api/forecast");

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as ForecastResponse;
    const session = body.sessions[0];
    const condition = session.hourly[0];

    expect(condition.time).toBeDefined();
    expect(condition.windSpeed).toBeDefined();
    expect(condition.windGusts).toBeDefined();
    expect(condition.windDirection).toBeDefined();
    expect(condition.windDirectionDeg).toBeDefined();
  });
});
