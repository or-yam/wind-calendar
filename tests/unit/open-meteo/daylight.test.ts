import { afterEach, expect, it, vi } from "vitest";
import { Effect } from "effect";
import { fetchOpenMeteoData } from "../../../server/open-meteo/forecast";
import type { OpenMeteoForecastResponse } from "../../../server/open-meteo/types";
import { daylightForecast } from "../../helpers/open-meteo-http-fixtures";
import { stubCalendarProviders } from "../../helpers/calendar-provider";

afterEach(() => vi.restoreAllMocks());

const fixture = () =>
  daylightForecast(
    ["2026-03-26T17:00", "2026-03-27T17:00"],
    [
      { day: "2026-03-26", sunrise: "06:15", sunset: "18:30" },
      { day: "2026-03-27", sunrise: "06:16", sunset: "18:31" },
    ],
  );
const fetchData = () => fetchOpenMeteoData(32.38, 34.87, "gfs_global", "Asia/Jerusalem");

it("normalizes every daily interval using the single response offset across DST", async () => {
  stubCalendarProviders(fixture);
  const result = await Effect.runPromise(fetchData());
  expect(result.daylight).toEqual([
    { sunrise: new Date("2026-03-26T04:15Z"), sunset: new Date("2026-03-26T16:30Z") },
    { sunrise: new Date("2026-03-27T04:16Z"), sunset: new Date("2026-03-27T16:31Z") },
  ]);
  expect([result.sunrise, result.sunset]).toEqual(["06:15", "18:30"]);
});

it.each<[string, (data: OpenMeteoForecastResponse) => void]>([
  ["nonfinite offset", (data) => (data.utc_offset_seconds = Infinity)],
  [
    "missing later day",
    (data) => {
      data.daily!.time.pop();
      data.daily!.sunrise.pop();
      data.daily!.sunset.pop();
    },
  ],
  ["mismatched arrays", (data) => data.daily!.sunset.pop()],
  ["duplicate daily dates", (data) => (data.daily!.time[1] = data.daily!.time[0])],
  [
    "invalid date",
    (data) => {
      data.daily!.time[1] = "2026-02-30";
      data.daily!.sunrise[1] = "2026-02-30T06:00";
      data.daily!.sunset[1] = "2026-02-30T18:00";
    },
  ],
  ["invalid instant", (data) => (data.daily!.sunrise[1] = "2026-03-27T25:00")],
  ["null later boundary", (data) => (data.daily!.sunset[1] = null as unknown as string)],
  ["reversed interval", (data) => (data.daily!.sunrise[1] = "2026-03-27T19:00")],
  ["empty interval", (data) => (data.daily!.sunrise[1] = data.daily!.sunset[1])],
  ["misaligned daily labels", (data) => data.daily!.sunrise.reverse()],
  ["overlapping intervals", (data) => (data.daily!.sunset[0] = "2026-03-27T07:00")],
  ["invalid hourly date", (data) => (data.hourly.time[1] = "2026-02-30T17:00")],
])("rejects %s as a typed provider data failure", async (_, mutate) => {
  const data = fixture();
  mutate(data);
  stubCalendarProviders(() => data);
  const error = await Effect.runPromise(fetchData().pipe(Effect.flip));
  expect(error._tag).toBe("ProviderDataError");
});
