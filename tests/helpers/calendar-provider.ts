import { vi } from "vitest";

export function openMeteoForecast(speeds = [18, 18, 18]) {
  return {
    utc_offset_seconds: 10800,
    daily: { sunrise: ["2026-06-15T05:30"], sunset: ["2026-06-15T20:00"] },
    hourly: {
      time: speeds.map((_, i) => `2026-06-15T${String(8 + i).padStart(2, "0")}:00`),
      wind_speed_10m: speeds,
      wind_direction_10m: speeds.map(() => 315),
      wind_gusts_10m: speeds.map((speed) => speed + 6),
    },
  };
}

export function stubCalendarProviders(forecast: (url: URL) => unknown) {
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname === "localhost") return realFetch(input, init);
    if (url.hostname === "api.open-meteo.com") {
      return Promise.resolve(Response.json(forecast(url)));
    }
    if (url.hostname === "marine-api.open-meteo.com") {
      return Promise.resolve(
        Response.json({ utc_offset_seconds: 10800, hourly: { time: [], wave_height: [] } }),
      );
    }
    throw new Error(`Unexpected provider request: ${url}`);
  });
}
