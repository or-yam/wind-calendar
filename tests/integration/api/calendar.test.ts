import { describe, it, expect, vi, beforeEach } from "vitest";
import { callHandler } from "../../helpers/nitro-mocks";
import { mockSpotInfo, mockAPIRoot, mockWindData } from "../../helpers/windguru-mocks";

vi.mock("../../../server/windguru/forecast", () => ({
  getForecast: vi.fn().mockImplementation(async (_locationCode: string, modelId: number) => {
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

import handler from "../../../server/api/calendar";

describe("calendar API handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("full pipeline: returns ICS with events", async () => {
    const res = await callHandler(handler, "/api/calendar");

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/calendar; charset=utf-8");
    expect(res.headers["cache-control"]).toBe(
      "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
    );
    expect(res.body.includes("BEGIN:VCALENDAR")).toBe(true);
    expect(res.body.includes("BEGIN:VEVENT")).toBe(true);
    expect(res.body.includes("END:VEVENT")).toBe(true);
    expect(res.body.includes("END:VCALENDAR")).toBe(true);
  });

  it("unknown location returns 400", async () => {
    const res = await callHandler(handler, "/api/calendar?location=unknown");

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.data?.error).toContain("Unknown location");
  });

  it("query param overrides work", async () => {
    const res = await callHandler(handler, "/api/calendar?windMin=20");

    expect(res.statusCode).toBe(200);
    expect(res.body.includes("BEGIN:VCALENDAR")).toBe(true);
    expect(res.body.includes("BEGIN:VEVENT")).toBe(false);
  });

  it("ICS contains calendar events for valid wind data", async () => {
    const res = await callHandler(handler, "/api/calendar");

    expect(res.statusCode).toBe(200);
    expect(res.body.includes("BEGIN:VEVENT")).toBe(true);
    expect(res.body.includes("END:VEVENT")).toBe(true);
    expect(res.body.includes("END:VCALENDAR")).toBe(true);
  });

  it("wave model failure is non-fatal — still returns ICS", async () => {
    const res = await callHandler(handler, "/api/calendar");

    expect(res.statusCode).toBe(200);
    expect(res.body.includes("BEGIN:VCALENDAR")).toBe(true);
  });

  it("X-Data-Source header is set", async () => {
    const res = await callHandler(handler, "/api/calendar");

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-data-source"]).toBe("windguru");
  });

  it("Content-Disposition header is set", async () => {
    const res = await callHandler(handler, "/api/calendar");

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-disposition"]).toContain("wind-forecast-beit-yanai.ics");
  });
});
