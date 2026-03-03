import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fetchOpenMeteoData } from "../../../server/open-meteo/forecast.js";
import type {
  OpenMeteoForecastResponse,
  OpenMeteoMarineResponse,
} from "../../../server/open-meteo/types.js";

// --- Mock Data ---

const mockForecastResponse: OpenMeteoForecastResponse = {
  latitude: 32.08,
  longitude: 34.78,
  elevation: 10,
  generationtime_ms: 0.5,
  utc_offset_seconds: 7200, // UTC+2 (Asia/Jerusalem in winter)
  timezone: "Asia/Jerusalem",
  timezone_abbreviation: "IST",
  hourly: {
    time: [
      "2026-03-03T00:00",
      "2026-03-03T01:00",
      "2026-03-03T02:00",
      "2026-03-03T03:00",
      "2026-03-03T04:00",
    ],
    wind_speed_10m: [12.5, 14.2, 16.1, 18.3, 15.7],
    wind_direction_10m: [270, 275, 280, 285, 290],
    wind_gusts_10m: [18.1, 20.3, 22.5, 24.8, 21.2],
  },
  hourly_units: {
    time: "iso8601",
    wind_speed_10m: "kn",
    wind_direction_10m: "°",
    wind_gusts_10m: "kn",
  },
  daily: {
    time: ["2026-03-03"],
    sunrise: ["2026-03-03T06:15"],
    sunset: ["2026-03-03T18:30"],
  },
  daily_units: {
    time: "iso8601",
    sunrise: "iso8601",
    sunset: "iso8601",
  },
};

const mockMarineResponse: OpenMeteoMarineResponse = {
  latitude: 32.08,
  longitude: 34.78,
  generationtime_ms: 0.3,
  utc_offset_seconds: 7200,
  timezone: "Asia/Jerusalem",
  timezone_abbreviation: "IST",
  hourly: {
    time: [
      "2026-03-03T00:00",
      "2026-03-03T01:00",
      "2026-03-03T02:00",
      "2026-03-03T03:00",
      "2026-03-03T04:00",
    ],
    wave_height: [0.8, 0.9, 1.1, 1.3, 1.2],
  },
  hourly_units: {
    time: "iso8601",
    wave_height: "m",
  },
};

// --- Test Helpers ---

let originalFetch: typeof globalThis.fetch;

function installFetchMock(responder?: (url: URL) => Response | null) {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request, _init?: RequestInit) => {
    const url = new URL(input.toString());

    if (responder) {
      const custom = responder(url);
      if (custom) return custom;
    }

    // Default: forecast API returns wind data, marine API returns wave data
    if (url.hostname === "api.open-meteo.com") {
      return new Response(JSON.stringify(mockForecastResponse));
    }
    if (url.hostname === "marine-api.open-meteo.com") {
      return new Response(JSON.stringify(mockMarineResponse));
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

// --- Tests ---

describe("fetchOpenMeteoData", () => {
  beforeEach(() => {
    installFetchMock();
  });

  afterEach(() => {
    restoreFetch();
  });

  it("fetches wind + wave data successfully", async () => {
    const result = await fetchOpenMeteoData(32.08, 34.78, "gfs_global", "Asia/Jerusalem");

    expect(result.windData).toHaveLength(5);
    expect(result.sunrise).toBe("06:15");
    expect(result.sunset).toBe("18:30");

    // Check first hour's data
    const firstHour = result.windData[0];
    expect(firstHour.windSpeed).toBe(12.5);
    expect(firstHour.windDirection).toBe(270);
    expect(firstHour.windGusts).toBe(18.1);
    expect(firstHour.waveHeight).toBe(0.8); // Merged from marine API

    // Verify timestamp parsing (UTC+2 offset applied correctly)
    // "2026-03-03T00:00" in Asia/Jerusalem (UTC+2) = "2026-03-02T22:00" UTC
    const expectedDate = new Date("2026-03-02T22:00:00.000Z");
    expect(firstHour.date.toISOString()).toBe(expectedDate.toISOString());
  });

  it("handles wave data fetch failure gracefully", async () => {
    installFetchMock((url) => {
      if (url.hostname === "marine-api.open-meteo.com") {
        return new Response("Marine API error", { status: 500 });
      }
      return null;
    });

    const result = await fetchOpenMeteoData(32.08, 34.78, "gfs_global", "Asia/Jerusalem");

    expect(result.windData).toHaveLength(5);
    expect(result.sunrise).toBe("06:15");
    expect(result.sunset).toBe("18:30");

    // Wave data should be null when marine API fails
    expect(result.windData[0].waveHeight).toBeNull();
  });

  it("throws when wind forecast API fails", async () => {
    installFetchMock((url) => {
      if (url.hostname === "api.open-meteo.com") {
        return new Response("Forecast API error", { status: 500 });
      }
      return null;
    });

    await expect(
      fetchOpenMeteoData(32.08, 34.78, "gfs_global", "Asia/Jerusalem"),
    ).rejects.toThrow();
  });

  it("throws when sunrise/sunset data is missing", async () => {
    const responseWithoutSunriseSunset: OpenMeteoForecastResponse = {
      ...mockForecastResponse,
      daily: undefined,
    };

    installFetchMock((url) => {
      if (url.hostname === "api.open-meteo.com") {
        return new Response(JSON.stringify(responseWithoutSunriseSunset));
      }
      return null;
    });

    await expect(fetchOpenMeteoData(32.08, 34.78, "gfs_global", "Asia/Jerusalem")).rejects.toThrow(
      "Missing sunrise/sunset data",
    );
  });

  it("handles null values in wind data arrays", async () => {
    const responseWithNulls: OpenMeteoForecastResponse = {
      ...mockForecastResponse,
      hourly: {
        time: ["2026-03-03T00:00", "2026-03-03T01:00"],
        wind_speed_10m: [12.5, null],
        wind_direction_10m: [270, null],
        wind_gusts_10m: [18.1, null],
      },
    };

    installFetchMock((url) => {
      if (url.hostname === "api.open-meteo.com") {
        return new Response(JSON.stringify(responseWithNulls));
      }
      return null;
    });

    const result = await fetchOpenMeteoData(32.08, 34.78, "gfs_global", "Asia/Jerusalem");

    expect(result.windData).toHaveLength(2);
    expect(result.windData[0].windSpeed).toBe(12.5);
    expect(result.windData[1].windSpeed).toBeNull();
    expect(result.windData[1].windDirection).toBeNull();
    expect(result.windData[1].windGusts).toBeNull();
  });

  it("correctly parses timezone offset for UTC+3 (summer time)", async () => {
    const summerResponse: OpenMeteoForecastResponse = {
      ...mockForecastResponse,
      utc_offset_seconds: 10800, // UTC+3 (Asia/Jerusalem in summer)
    };

    installFetchMock((url) => {
      if (url.hostname === "api.open-meteo.com") {
        return new Response(JSON.stringify(summerResponse));
      }
      return null;
    });

    const result = await fetchOpenMeteoData(32.08, 34.78, "gfs_global", "Asia/Jerusalem");

    // "2026-03-03T00:00" in Asia/Jerusalem (UTC+3) = "2026-03-02T21:00" UTC
    const expectedDate = new Date("2026-03-02T21:00:00.000Z");
    expect(result.windData[0].date.toISOString()).toBe(expectedDate.toISOString());
  });

  it("merges wave data by matching timestamps", async () => {
    // Marine API has different hours but some overlapping
    const marineWithPartialOverlap: OpenMeteoMarineResponse = {
      ...mockMarineResponse,
      hourly: {
        time: [
          "2026-03-03T01:00", // Matches second wind hour
          "2026-03-03T02:00", // Matches third wind hour
          "2026-03-03T05:00", // No match in wind data
        ],
        wave_height: [0.9, 1.1, 1.5],
      },
    };

    installFetchMock((url) => {
      if (url.hostname === "marine-api.open-meteo.com") {
        return new Response(JSON.stringify(marineWithPartialOverlap));
      }
      return null;
    });

    const result = await fetchOpenMeteoData(32.08, 34.78, "gfs_global", "Asia/Jerusalem");

    expect(result.windData).toHaveLength(5);
    expect(result.windData[0].waveHeight).toBeNull(); // No match for hour 0
    expect(result.windData[1].waveHeight).toBe(0.9); // Match for hour 1
    expect(result.windData[2].waveHeight).toBe(1.1); // Match for hour 2
    expect(result.windData[3].waveHeight).toBeNull(); // No match for hour 3
    expect(result.windData[4].waveHeight).toBeNull(); // No match for hour 4
  });

  it("handles Open-Meteo API validation errors", async () => {
    installFetchMock((url) => {
      if (url.hostname === "api.open-meteo.com") {
        return new Response(
          JSON.stringify({
            error: true,
            reason: "Invalid model parameter",
          }),
          { status: 400 },
        );
      }
      return null;
    });

    await expect(
      fetchOpenMeteoData(32.08, 34.78, "invalid_model", "Asia/Jerusalem"),
    ).rejects.toThrow("API request failed: 400");
  });

  it("extracts time correctly from various timestamp formats", async () => {
    const responseWithDifferentTimeFormats: OpenMeteoForecastResponse = {
      ...mockForecastResponse,
      daily: {
        time: ["2026-03-03"],
        sunrise: ["2026-03-03T06:15:42"], // With seconds
        sunset: ["2026-03-03T18:30:15"], // With seconds
      },
    };

    installFetchMock((url) => {
      if (url.hostname === "api.open-meteo.com") {
        return new Response(JSON.stringify(responseWithDifferentTimeFormats));
      }
      return null;
    });

    const result = await fetchOpenMeteoData(32.08, 34.78, "gfs_global", "Asia/Jerusalem");

    // Should extract just HH:MM part
    expect(result.sunrise).toBe("06:15");
    expect(result.sunset).toBe("18:30");
  });
});
