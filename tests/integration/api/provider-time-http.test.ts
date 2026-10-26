import { afterEach, beforeEach, expect, it, vi } from "vitest";
import handler from "../../../server/api/forecast";
import { __resetForTesting } from "../../../server/utils/rate-limit";
import type { ForecastResponse } from "../../../shared/forecast-types";
import { daylightForecast, openMeteoMarine } from "../../helpers/open-meteo-http-fixtures";
import { stubCalendarProviders } from "../../helpers/calendar-provider";
import { providerHour } from "../../helpers/provider-hours";
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

it.each([
  {
    transition: "spring gap",
    day: "2026-03-27",
    offset: 7200,
    labels: ["2026-03-27T01:30", "2026-03-27T02:30"],
    expected: [
      ["2026-03-26T23:30:00.000Z", 1],
      ["2026-03-27T00:30:00.000Z", 2],
    ],
  },
  {
    transition: "autumn repeated hour",
    day: "2026-10-25",
    offset: 10800,
    labels: ["2026-10-25T01:30", "2026-10-25T02:30"],
    expected: [
      ["2026-10-24T22:30:00.000Z", 1],
      ["2026-10-24T23:30:00.000Z", 2],
    ],
  },
])("preserves exact instants and marine matches across the $transition", async (fixture) => {
  const marine = openMeteoMarine(32.38, 34.87, [providerHour(1, 18), providerHour(2, 18)]);
  marine.utc_offset_seconds = fixture.offset;
  marine.timezone_abbreviation = fixture.offset === 7200 ? "IST" : "IDT";
  marine.hourly.time = [...fixture.labels].reverse();
  marine.hourly.wave_height = [2, 1];
  stubCalendarProviders(
    () =>
      daylightForecast(
        fixture.labels,
        [{ day: fixture.day, sunrise: "00:00", sunset: "23:59" }],
        fixture.offset,
      ),
    marine,
  );
  const response = await callHandler(handler, "/api/forecast?model=om_gfs&minSessionHours=0");
  expect(response.statusCode).toBe(200);
  const body = JSON.parse(response.body) as ForecastResponse;
  expect(
    body.sessions.flatMap((session) =>
      session.hourly.map(({ time, waveHeight }) => [time, waveHeight]),
    ),
  ).toEqual(fixture.expected);
});
