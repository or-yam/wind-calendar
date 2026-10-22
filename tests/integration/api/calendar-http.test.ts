// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import handler from "../../../server/api/calendar";
import { __resetForTesting } from "../../../server/utils/rate-limit";
import { callHandler } from "../../helpers/nitro-mocks";
import { readIcsEvents } from "../../helpers/ics-events";
import { mockExternalFetch, providerResponse } from "../../helpers/provider-http";

describe.each([
  { provider: "openmeteo", query: "" },
  { provider: "windguru", query: "model=117" },
])("calendar HTTP happy flows: $provider", ({ provider, query }) => {
  let http: ReturnType<typeof mockExternalFetch>;
  beforeEach(() => {
    __resetForTesting();
    http = mockExternalFetch((url) => providerResponse(url));
  });
  afterEach(() => {
    http.spy.mockRestore();
    __resetForTesting();
  });

  it("generates real UTC events with exact location, wind, wave and hourly content", async () => {
    const res = await callHandler(handler, `/api/calendar?${query}`);
    expect(res.statusCode).toBe(200);
    expect(res.headers).toMatchObject({
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
      "x-data-source": provider,
      "content-disposition": 'inline; filename="wind-forecast-beit-yanai.ics"',
    });
    expect(res.headers["x-fallback-used"]).toBeUndefined();
    expect(res.body).toMatch(/^BEGIN:VCALENDAR\r\nVERSION:2.0\r\n/);
    expect(res.body.trimEnd()).toMatch(/END:VCALENDAR$/);
    const marine = provider === "openmeteo";
    const events = readIcsEvents(res.body);
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      DTSTART: "20990615T030000Z",
      DTEND: "20990615T060000Z",
      SUMMARY: "► Wind 14-20kn W — Beit Yanai",
      DESCRIPTION: [
        "Location: Beit Yanai",
        `06:00  14kn  gusts 21kn  W  waves 1.2m${marine ? " 6s" : ""}`,
        `07:00  18kn  gusts 25kn  NW  waves 1.6m${marine ? " 8s" : ""}`,
        `08:00  20kn  gusts 27kn  W  waves 2.0m${marine ? " 10s" : ""}`,
      ].join("\n"),
    });
    expect(events[1]).toMatchObject({
      DTSTART: "20990615T100000Z",
      DTEND: "20990615T120000Z",
      SUMMARY: "► Wind 16-17kn W — Beit Yanai",
      DESCRIPTION: [
        "Location: Beit Yanai",
        `13:00  16kn  gusts 23kn  W  waves 0.3m${marine ? " 4s" : ""}`,
        `14:00  17kn  gusts 24kn  W  waves 0.3m${marine ? " 4s" : ""}`,
      ].join("\n"),
    });
    expect(events[2]).toMatchObject({
      DTSTART: "20990615T150000Z",
      DTEND: "20990615T160000Z",
    });
    for (const event of events) {
      expect(event.UID).toBeTruthy();
      expect(event.DTSTAMP).toMatch(/^\d{8}T\d{6}Z$/);
    }
    expect(new Set(events.map((event) => event.UID)).size).toBe(3);
  });

  it("returns a valid empty calendar when the overridden wind threshold excludes all daylight", async () => {
    const res = await callHandler(handler, `/api/calendar?${query}&windMin=21`);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/calendar; charset=utf-8");
    expect(res.headers["x-data-source"]).toBe(provider);
    expect(res.body).toContain("BEGIN:VCALENDAR\r\n");
    expect(res.body.trimEnd()).toMatch(/END:VCALENDAR$/);
    expect(readIcsEvents(res.body)).toEqual([]);
    expect(res.body).not.toContain("BEGIN:VEVENT");
  });
});
