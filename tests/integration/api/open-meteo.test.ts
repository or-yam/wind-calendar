import { describe, it, expect, vi, beforeEach } from "vitest";
import { callHandler } from "../../helpers/nitro-mocks";
import { mockSpotInfo, mockAPIRoot, mockWindData } from "../../helpers/windguru-mocks";

vi.mock("../../../server/windguru/forecast", () => ({
  getForecast: vi.fn().mockResolvedValue(mockAPIRoot),
  fetchSpotInfo: vi.fn().mockResolvedValue(mockSpotInfo),
}));

vi.mock("../../../server/windguru/api", () => ({
  fetchWindData: vi.fn().mockImplementation(async () => {
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

vi.mock("../../../server/open-meteo/forecast", () => ({
  fetchOpenMeteoData: vi.fn().mockImplementation(async () => {
    const futureDate = "2030-06-15T00:00";
    return {
      forecast: {
        latitude: 32.08,
        longitude: 34.78,
        hourly: {
          time: Array.from(
            { length: 21 },
            (_, i) => `${futureDate.replace("00:00", `${String(i).padStart(2, "0")}:00`)}`,
          ),
          wind_speed_10m: Array(21).fill(15),
          wind_direction_10m: Array(21).fill(270),
          wind_gusts_10m: Array(21).fill(20),
        },
        daily: {
          time: ["2030-06-15"],
          sunrise: ["2030-06-15T05:30"],
          sunset: ["2030-06-15T19:50"],
        },
      },
      marine: null,
    };
  }),
}));

vi.mock("../../../server/utils/api-handler", async () => {
  const actual = await vi.importActual("../../../server/utils/api-handler");
  return {
    ...actual,
    resolveForecastData: vi
      .fn()
      .mockImplementation(async (_config: any, _location: any, _dev: boolean) => {
        const model = String(_config.model ?? "");
        if (model.startsWith("om_")) {
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
            dataSource: "openmeteo",
            fallbackUsed: false,
          };
        }
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

describe("Open-Meteo provider integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully fetches Open-Meteo data and returns ICS calendar", async () => {
    const res = await callHandler(
      handler,
      "/api/calendar?location=tel-aviv&model=om_gfs&windMin=10",
    );

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/calendar; charset=utf-8");
    expect(res.headers["x-data-source"]).toBe("openmeteo");
    expect(res.headers["x-fallback-used"]).toBeUndefined();
    expect(res.body.includes("BEGIN:VCALENDAR")).toBe(true);
    expect(res.body.includes("BEGIN:VEVENT")).toBe(true);
  });

  it("supports all Open-Meteo models (om_gfs, om_icon, om_gdps, om_ifs)", async () => {
    const models = ["om_gfs", "om_icon", "om_gdps", "om_ifs"];

    for (const model of models) {
      const res = await callHandler(
        handler,
        `/api/calendar?location=tel-aviv&model=${model}&windMin=10`,
      );

      expect(res.statusCode).toBe(200);
      expect(res.headers["x-data-source"]).toBe("openmeteo");
    }
  });

  it("supports Windguru fallback", async () => {
    const res = await callHandler(handler, "/api/calendar?location=tel-aviv&model=3&windMin=10");

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-data-source"]).toBe("windguru");
  });

  it("applies wind filters correctly to Open-Meteo data", async () => {
    const res = await callHandler(
      handler,
      "/api/calendar?location=tel-aviv&model=om_gfs&windMin=20",
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.includes("BEGIN:VCALENDAR")).toBe(true);
    expect(res.body.includes("BEGIN:VEVENT")).toBe(false);
  });

  it("returns correct cache headers for Open-Meteo responses", async () => {
    const res = await callHandler(
      handler,
      "/api/calendar?location=tel-aviv&model=om_gfs&windMin=10",
    );

    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe(
      "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
    );
  });

  it("both disabled returns empty calendar", async () => {
    const res = await callHandler(
      handler,
      "/api/calendar?location=tel-aviv&model=om_gfs&windEnabled=false&waveEnabled=false",
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.includes("BEGIN:VCALENDAR")).toBe(true);
    expect(res.body.includes("BEGIN:VEVENT")).toBe(false);
  });
});
