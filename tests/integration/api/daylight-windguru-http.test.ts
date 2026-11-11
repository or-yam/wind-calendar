import { afterEach, beforeEach, expect, it, vi } from "vitest";
import forecast from "../../../server/api/forecast";
import calendar from "../../../server/api/calendar";
import type { ForecastResponse } from "../../../shared/forecast-types";
import { __resetForTesting } from "../../../server/utils/rate-limit";
import { mockSpotInfo, buildMockAPIRoot } from "../../helpers/windguru-mocks";
import { callHandler } from "../../helpers/nitro-mocks";
import { readIcsEvents } from "../../helpers/ics-events";
import { daylightForecast } from "../../helpers/open-meteo-http-fixtures";

beforeEach(() => {
  vi.setSystemTime(new Date("2026-01-01T00:00Z"));
  __resetForTesting();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  __resetForTesting();
});

function stubWindguru(day: string, sunrise: string, sunset: string) {
  const labels = [sunrise, sunset].flatMap((time) => {
    const at = new Date(`${day}T${time}:00Z`).getTime();
    return [new Date(at - 60_000).toISOString(), new Date(at).toISOString()];
  });
  const root = buildMockAPIRoot(
    labels.map(() => 18),
    labels.map(
      (label) => (new Date(label).getTime() - new Date(`${day}T00:00Z`).getTime()) / 3_600_000,
    ),
  );
  root.fcst.initstamp = new Date(`${day}T00:00Z`).getTime() / 1000;
  root.sunrise = "06:15";
  root.sunset = "18:30";
  const spot = structuredClone(mockSpotInfo);
  spot.spots["771"].models.push(84);
  spot.tabs[0].id_model_arr.push({ ...spot.tabs[0].id_model_arr[0], id_model: 84 });
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname === "localhost") return realFetch(input, init);
    if (url.hostname === "api.open-meteo.com") {
      return Response.json(daylightForecast([`${day}T12:00`], []));
    }
    if (url.hostname === "marine-api.open-meteo.com") {
      return Response.json({ hourly: { time: [], wave_height: [] }, utc_offset_seconds: 7200 });
    }
    if (url.searchParams.get("q") === "forecast_spot") return Response.json(spot);
    if (url.searchParams.get("q") === "forecast") return Response.json(root);
    throw new Error(`Unexpected provider request: ${url}`);
  });
  return labels;
}

it.each([
  ["2026-01-02", "04:15", "16:30"],
  ["2026-03-27", "03:15", "15:30"],
  ["2026-10-25", "04:15", "16:30"],
])("keeps Windguru minute admission and sunset caps on %s", async (day, sunrise, sunset) => {
  const labels = stubWindguru(day, sunrise, sunset);
  const json = await callHandler(forecast, "/api/forecast?model=3&minSessionHours=0");
  const ics = await callHandler(calendar, "/api/calendar?model=3&minSessionHours=0");
  expect(json.statusCode).toBe(200);
  expect(ics.statusCode).toBe(200);
  const body = JSON.parse(json.body) as ForecastResponse;
  expect(body.meta.dataSource).toBe("windguru");
  expect(body.sessions.flatMap((session) => session.hourly.map(({ time }) => time))).toEqual([
    labels[1],
    labels[2],
  ]);
  expect(body.sessions.at(-1)?.end).toBe(labels[3]);
  expect(readIcsEvents(ics.body).at(-1)?.DTEND).toBe(
    labels[3].replace(/[-:]/g, "").replace(".000", ""),
  );
  expect(JSON.stringify(body)).not.toContain("daylight");
});

it("falls back to Windguru when Open-Meteo daylight is incomplete", async () => {
  stubWindguru("2026-01-02", "04:15", "16:30");
  const response = await callHandler(forecast, "/api/forecast?model=om_gfs&minSessionHours=0");
  expect(response.statusCode).toBe(200);
  expect(response.headers["x-data-source"]).toBe("windguru");
  expect(response.headers["x-fallback-used"]).toBe("true");
  expect((JSON.parse(response.body) as ForecastResponse).sessions).toHaveLength(2);
});
