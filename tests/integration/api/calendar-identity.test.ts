import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../server/api/calendar";
import { __resetForTesting } from "../../../server/utils/rate-limit";
import { openMeteoForecast, stubCalendarProviders } from "../../helpers/calendar-provider";
import { readIcsEvents } from "../../helpers/ics";
import { callHandler } from "../../helpers/nitro-mocks";

const query =
  "/api/calendar?locations=beit-yanai&model=om_gfs&windMin=14&windMax=30&minSessionHours=2";

beforeEach(() => {
  __resetForTesting();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-06-14T00:00:00Z"));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("calendar API event identity", () => {
  it("keeps event identity across separate HTTP refreshes", async () => {
    stubCalendarProviders(() => openMeteoForecast());
    const first = await callHandler(handler, query);
    vi.setSystemTime(new Date("2026-06-14T06:00:00Z"));
    const refreshed = await callHandler(handler, query);

    expect(first.statusCode).toBe(200);
    expect(refreshed.statusCode).toBe(200);
    const entries = readIcsEvents(first.body);
    expect(entries).toHaveLength(1);
    expect(entries[0].UID).toBeTruthy();
    expect(readIcsEvents(refreshed.body)[0].UID).toBe(entries[0].UID);
    expect(entries[0].DTSTART).toBe("20260615T050000Z");
    expect(entries[0].DTEND).toBe("20260615T080000Z");
    expect(entries[0].DTSTAMP).toBe("20260614T000000Z");
    expect(readIcsEvents(refreshed.body)[0].DTSTAMP).toBe("20260614T060000Z");
  });

  it("updates weather details without changing the event UID", async () => {
    let speeds = [18, 18, 18];
    stubCalendarProviders(() => openMeteoForecast(speeds));
    const first = await callHandler(handler, query);
    speeds = [20, 20, 20];
    vi.setSystemTime(new Date("2026-06-14T06:00:00Z"));
    const refreshed = await callHandler(handler, query);
    expect(first.statusCode).toBe(200);
    expect(refreshed.statusCode).toBe(200);
    const [original] = readIcsEvents(first.body);
    const entries = readIcsEvents(refreshed.body);
    expect(entries).toHaveLength(1);
    expect(entries[0].UID).toBe(original.UID);
    expect(entries[0].SUMMARY).toContain("Wind 20kn");
    expect(entries[0].DESCRIPTION).toContain("20kn  gusts 26kn");
    expect(entries[0].SUMMARY).not.toBe(original.SUMMARY);
    expect(entries[0].DESCRIPTION).not.toBe(original.DESCRIPTION);
  });

  it.each([
    [
      "preferences",
      "/api/calendar?locations=beit-yanai&model=om_gfs&windMin=15&windMax=40&minSessionHours=1",
    ],
    [
      "model",
      "/api/calendar?locations=beit-yanai&model=om_icon&windMin=14&windMax=30&minSessionHours=2",
    ],
  ])("does not include %s in identity when the session is unchanged", async (_, changedQuery) => {
    stubCalendarProviders(() => openMeteoForecast());
    const first = await callHandler(handler, query);
    const changed = await callHandler(handler, changedQuery);
    expect(first.statusCode).toBe(200);
    expect(changed.statusCode).toBe(200);
    const entries = readIcsEvents(changed.body);
    expect(entries).toHaveLength(1);
    expect(entries[0].UID).toBe(readIcsEvents(first.body)[0].UID);
  });
});
