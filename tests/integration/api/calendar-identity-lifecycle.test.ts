import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../server/api/calendar";
import { __resetForTesting } from "../../../server/utils/rate-limit";
import { openMeteoForecast, stubCalendarProviders } from "../../helpers/calendar-provider";
import { readIcsEvents } from "../../helpers/ics";
import { callHandler } from "../../helpers/nitro-mocks";

const query =
  "/api/calendar?locations=beit-yanai&model=om_gfs&windMin=14&windMax=30&minSessionHours=2";

async function requestEvents(url = query) {
  const response = await callHandler(handler, url);
  expect(response.statusCode).toBe(200);
  expect(response.headers["content-type"]).toBe("text/calendar; charset=utf-8");
  expect(response.body).toContain("BEGIN:VCALENDAR");
  return readIcsEvents(response.body);
}

beforeEach(() => {
  __resetForTesting();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-06-14T00:00:00Z"));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("calendar event lifecycle", () => {
  it.each([
    ["start", [0, 18, 18], "20260615T060000Z", "20260615T080000Z"],
    ["end", [18, 18, 0], "20260615T050000Z", "20260615T070000Z"],
  ])("replaces identity when only the session %s changes", async (_, next, start, end) => {
    let speeds = [18, 18, 18];
    stubCalendarProviders(() => openMeteoForecast(speeds));
    const original = await requestEvents();
    expect(original).toHaveLength(1);
    speeds = next;
    const changed = await requestEvents();
    expect(changed).toHaveLength(1);
    expect(changed[0].DTSTART).toBe(start);
    expect(changed[0].DTEND).toBe(end);
    expect(changed[0].UID).not.toBe(original[0].UID);
  });

  it("removes a nonmatching session and restores its ID if it returns", async () => {
    let speeds = [18, 18, 18];
    stubCalendarProviders(() => openMeteoForecast(speeds));
    const original = await requestEvents();
    expect(original).toHaveLength(1);
    speeds = [5, 5, 5];
    expect(await requestEvents()).toHaveLength(0);
    speeds = [18, 18, 18];
    expect((await requestEvents()).map((event) => event.UID)).toEqual([original[0].UID]);
  });

  it("gives split sessions separate IDs and restores the original ID when merged", async () => {
    let speeds = Array<number>(9).fill(18);
    stubCalendarProviders(() => openMeteoForecast(speeds));
    const original = await requestEvents();
    expect(original).toHaveLength(1);
    speeds = [18, 18, 0, 0, 0, 18, 18, 18, 18];
    const split = await requestEvents();
    expect(split.map((event) => [event.DTSTART, event.DTEND])).toEqual([
      ["20260615T050000Z", "20260615T070000Z"],
      ["20260615T100000Z", "20260615T140000Z"],
    ]);
    expect(new Set(split.map((event) => event.UID)).size).toBe(2);
    expect(split.every((event) => event.UID && event.UID !== original[0].UID)).toBe(true);
    speeds = Array<number>(9).fill(18);
    expect((await requestEvents()).map((event) => event.UID)).toEqual([original[0].UID]);
  });

  it("changes the winning spot's ID without changing an unrelated session's ID", async () => {
    let telAvivMorning = 18;
    stubCalendarProviders((url) =>
      openMeteoForecast(
        url.searchParams.get("latitude") === "32.38"
          ? [20, 20, 0, 0, 0, 18, 18, 18, 18]
          : [telAvivMorning, telAvivMorning, 0, 0, 0, 16, 16, 16, 16],
      ),
    );
    const url = query.replace("locations=beit-yanai", "locations=beit-yanai,tel-aviv");
    const original = await requestEvents(url);
    expect(original).toHaveLength(2);
    expect(original[0].SUMMARY).toContain("Beit Yanai");
    telAvivMorning = 22;
    const changed = await requestEvents(url);
    expect(changed).toHaveLength(2);
    expect(changed[0].SUMMARY).toContain("Tel Aviv");
    expect(changed[0].DTSTART).toBe(original[0].DTSTART);
    expect(changed[0].DTEND).toBe(original[0].DTEND);
    expect(changed[0].UID).not.toBe(original[0].UID);
    expect(changed[1].UID).toBe(original[1].UID);
  });
});
