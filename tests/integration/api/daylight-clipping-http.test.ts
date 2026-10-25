import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import forecast from "../../../server/api/forecast";
import calendar from "../../../server/api/calendar";
import { __resetForTesting } from "../../../server/utils/rate-limit";
import type { ForecastResponse } from "../../../shared/forecast-types";
import { daylightForecast } from "../../helpers/open-meteo-http-fixtures";
import { stubCalendarProviders } from "../../helpers/calendar-provider";
import { callHandler } from "../../helpers/nitro-mocks";
import { readIcsEvents } from "../../helpers/ics-events";

beforeEach(() => {
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  __resetForTesting();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  __resetForTesting();
});

describe.each([
  {
    endpoint: "forecast",
    handler: forecast,
    expected: [["2026-01-02T15:00:00.000Z", "2026-01-02T16:30:00.000Z"]],
  },
  { endpoint: "calendar", handler: calendar, expected: [["20260102T150000Z", "20260102T163000Z"]] },
])("$endpoint sunset clipping", ({ endpoint, handler, expected }) => {
  it.each([
    { minimum: 1.5, keep: true },
    { minimum: 1.5001, keep: false },
  ])("clips to 90 minutes before applying a $minimum hour minimum", async ({ minimum, keep }) => {
    stubCalendarProviders(() =>
      daylightForecast(
        ["2026-01-02T17:00", "2026-01-02T18:00"],
        [{ day: "2026-01-02", sunrise: "06:00", sunset: "18:30" }],
      ),
    );
    const response = await callHandler(
      handler,
      `/api/${endpoint}?model=om_gfs&minSessionHours=${minimum}`,
    );
    expect(response.statusCode).toBe(200);
    const bounds =
      endpoint === "forecast"
        ? (JSON.parse(response.body) as ForecastResponse).sessions.map(({ start, end }) => [
            start,
            end,
          ])
        : readIcsEvents(response.body).map(({ DTSTART, DTEND }) => [DTSTART, DTEND]);
    expect(bounds).toEqual(keep ? expected : []);
  });
});
