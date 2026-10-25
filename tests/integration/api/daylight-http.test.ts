import { afterEach, beforeEach, expect, it, vi } from "vitest";
import handler from "../../../server/api/forecast";
import { __resetForTesting } from "../../../server/utils/rate-limit";
import type { ForecastResponse } from "../../../shared/forecast-types";
import { daylightForecast } from "../../helpers/open-meteo-http-fixtures";
import { stubCalendarProviders } from "../../helpers/calendar-provider";
import { callHandler } from "../../helpers/nitro-mocks";

beforeEach(() => {
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  __resetForTesting();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  __resetForTesting();
});

const query = "/api/forecast?model=om_gfs&minSessionHours=0";

it("uses each forecast day's sunrise instead of reusing the first day", async () => {
  stubCalendarProviders(() =>
    daylightForecast(
      ["2026-01-02T06:00", "2026-01-03T06:00"],
      [
        { day: "2026-01-02", sunrise: "06:00", sunset: "18:00" },
        { day: "2026-01-03", sunrise: "07:00", sunset: "18:00" },
      ],
    ),
  );
  const response = await callHandler(handler, query);
  expect(response.statusCode).toBe(200);
  const body = JSON.parse(response.body) as ForecastResponse;
  expect(body.sessions.flatMap((session) => session.hourly.map((hour) => hour.time))).toEqual([
    "2026-01-02T04:00:00.000Z",
  ]);
});

it("keeps pre-sunset samples on both sides of spring DST with the provider's fixed offset", async () => {
  stubCalendarProviders(() =>
    daylightForecast(
      ["2026-03-26T17:00", "2026-03-27T17:00"],
      [
        { day: "2026-03-26", sunrise: "06:00", sunset: "17:30" },
        { day: "2026-03-27", sunrise: "06:00", sunset: "17:30" },
      ],
      7200,
    ),
  );
  const response = await callHandler(handler, query);
  expect(response.statusCode).toBe(200);
  const body = JSON.parse(response.body) as ForecastResponse;
  expect(body.sessions.flatMap((session) => session.hourly.map((hour) => hour.time))).toEqual([
    "2026-03-26T15:00:00.000Z",
    "2026-03-27T15:00:00.000Z",
  ]);
});

it("rejects post-sunset samples on both sides of autumn DST with the provider's fixed offset", async () => {
  stubCalendarProviders(() =>
    daylightForecast(
      ["2026-10-24T19:00", "2026-10-25T19:00"],
      [
        { day: "2026-10-24", sunrise: "06:00", sunset: "18:30" },
        { day: "2026-10-25", sunrise: "06:00", sunset: "18:30" },
      ],
      10800,
    ),
  );
  const response = await callHandler(handler, query);
  expect(response.statusCode).toBe(200);
  expect((JSON.parse(response.body) as ForecastResponse).sessions).toEqual([]);
});
