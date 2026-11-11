// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import forecast from "../../../server/api/forecast";
import calendar from "../../../server/api/calendar";
import { __resetForTesting } from "../../../server/utils/rate-limit";
import type { ForecastResponse } from "../../../shared/forecast-types";
import { LOCATIONS } from "../../../shared/locations";
import { callHandler } from "../../helpers/nitro-mocks";
import { readIcsEvents } from "../../helpers/ics-events";
import { mockExternalFetch, providerResponse } from "../../helpers/provider-http";
import {
  PROVIDER_NOW,
  providerHour,
  utcTime,
  type ProviderFixtures,
} from "../../helpers/provider-hours";

const fixtures: ProviderFixtures = {
  "beit-yanai": [3, 4, 5, 10, 11].map((hour) => providerHour(hour, hour < 10 ? 18 : 22)),
  "tel-aviv": [3, 4, 5, 6, 7].map((hour) => providerHour(hour, hour < 6 ? 24 : 21)),
  herzliya: [3, 4, 5, 14, 15].map((hour) => providerHour(hour, hour < 14 ? 15 : 20)),
};

describe.each([
  { provider: "openmeteo", model: "om_ifs" },
  { provider: "windguru", model: 59 },
])("multi-location HTTP happy flows: $provider", ({ provider, model }) => {
  let http: ReturnType<typeof mockExternalFetch>;
  beforeEach(() => {
    vi.setSystemTime(new Date(PROVIDER_NOW));
    __resetForTesting();
    http = mockExternalFetch((url) => providerResponse(url, fixtures));
  });
  afterEach(() => {
    http.spy.mockRestore();
    vi.useRealTimers();
    __resetForTesting();
  });

  it.each([
    ["CSV", "locations=beit-yanai,tel-aviv,herzliya", ["beit-yanai", "tel-aviv", "herzliya"]],
    [
      "repeated",
      "locations=beit-yanai&locations=tel-aviv&locations=herzliya",
      ["beit-yanai", "tel-aviv", "herzliya"],
    ],
    [
      "mixed/deduplicated",
      "locations=herzliya,beit-yanai&locations=herzliya,tel-aviv,beit-yanai&location=ashkelon",
      ["herzliya", "beit-yanai", "tel-aviv"],
    ],
  ] as const)(
    "ranks independent %s locations without dropping nonoverlapping successes",
    async (_style, locations, order) => {
      const query = `${locations}&model=${model}`;
      const json = await callHandler(forecast, `/api/forecast?${query}`);
      expect(json.statusCode).toBe(200);
      const body = JSON.parse(json.body) as ForecastResponse;
      expect(body.meta).toMatchObject({
        location: order[0],
        locations: order,
        model,
        dataSource: provider,
        dataSources: { "beit-yanai": provider, "tel-aviv": provider, herzliya: provider },
      });
      expect(json.headers["x-fallback-used"]).toBeUndefined();
      expect(
        body.sessions.map((s) => [s.location, s.start, s.end, s.hourly.map((h) => h.windSpeed)]),
      ).toEqual([
        [{ id: "tel-aviv", label: "Tel Aviv" }, utcTime(3), utcTime(8), [24, 24, 24, 21, 21]],
        [{ id: "beit-yanai", label: "Beit Yanai" }, utcTime(10), utcTime(12), [22, 22]],
        [{ id: "herzliya", label: "Herzliya" }, utcTime(14), utcTime(16), [20, 20]],
      ]);

      const ics = await callHandler(calendar, `/api/calendar?${query}`);
      expect(ics.statusCode).toBe(200);
      expect(ics.headers["content-disposition"]).toBe(
        `inline; filename="wind-forecast-${order.join("-")}.ics"`,
      );
      expect(ics.headers["x-data-source"]).toBe(provider);
      expect(ics.headers["x-fallback-used"]).toBeUndefined();
      const events = readIcsEvents(ics.body);
      expect(events.map((event) => [event.DTSTART, event.DTEND, event.SUMMARY])).toEqual([
        ["20260615T030000Z", "20260615T080000Z", "► Wind 21-24kn W — Tel Aviv"],
        ["20260615T100000Z", "20260615T120000Z", "► Wind 22kn W — Beit Yanai"],
        ["20260615T140000Z", "20260615T160000Z", "► Wind 20kn W — Herzliya"],
      ]);
      expect(events.map((event) => event.DESCRIPTION.split("\n")[0])).toEqual([
        "Location: Tel Aviv",
        "Location: Beit Yanai",
        "Location: Herzliya",
      ]);

      // Count forecast components, not Windguru's potentially shareable spot metadata requests.
      expect(
        http.requests.every((url) =>
          provider === "windguru"
            ? url.hostname === "www.windguru.cz"
            : ["api.open-meteo.com", "marine-api.open-meteo.com"].includes(url.hostname),
        ),
      ).toBe(true);
      const components = http.requests.filter(
        (url) => provider !== "windguru" || url.searchParams.get("q") === "forecast",
      );
      expect(components).toHaveLength(12);
      for (const id of order) {
        const location = LOCATIONS[id];
        if (provider === "windguru") {
          const requests = components.filter(
            (url) => url.searchParams.get("id_spot") === location.spotId,
          );
          expect(requests).toHaveLength(4);
          expect(
            requests
              .filter((url) => url.searchParams.get("q") === "forecast")
              .map((url) => url.searchParams.get("id_model"))
              .sort(),
          ).toEqual(["59", "59", "84", "84"]);
        } else {
          const requests = http.requests.filter(
            (url) =>
              url.searchParams.get("latitude") === String(location.coordinates.lat) &&
              url.searchParams.get("longitude") === String(location.coordinates.lon),
          );
          expect(requests).toHaveLength(4);
          expect(
            requests
              .filter((url) => url.hostname === "api.open-meteo.com")
              .map((url) => url.searchParams.get("models")),
          ).toEqual(["ecmwf_ifs025", "ecmwf_ifs025"]);
        }
      }
    },
  );

  it("applies minSessionHours to the selected location runs in both endpoints", async () => {
    const query = `locations=beit-yanai,tel-aviv,herzliya&model=${model}&minSessionHours=3`;
    const json = await callHandler(forecast, `/api/forecast?${query}`);
    expect(json.statusCode).toBe(200);
    const body = JSON.parse(json.body) as ForecastResponse;
    expect(body.sessions.map((s) => [s.location.id, s.start, s.end])).toEqual([
      ["tel-aviv", utcTime(3), utcTime(8)],
    ]);
    expect(Object.keys(body.meta.dataSources)).toHaveLength(3);
    const ics = await callHandler(calendar, `/api/calendar?${query}`);
    expect(ics.statusCode).toBe(200);
    expect(
      readIcsEvents(ics.body).map((event) => [event.DTSTART, event.DTEND, event.SUMMARY]),
    ).toEqual([["20260615T030000Z", "20260615T080000Z", "► Wind 21-24kn W — Tel Aviv"]]);
  });
});
