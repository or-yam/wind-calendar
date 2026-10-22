import { afterEach, describe, expect, it, vi } from "vitest";
import { generateIcsEvents } from "../../../server/utils/generateIcsEvents";
import { calendarSession } from "../../helpers/calendar-session";
import { readIcsEvents } from "../../helpers/ics";

afterEach(() => vi.useRealTimers());

describe("calendar event identity", () => {
  it("keeps the same UID when an unchanged session is fetched later", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-14T00:00:00Z"));
    const [first] = readIcsEvents(generateIcsEvents([calendarSession()]));

    vi.setSystemTime(new Date("2026-06-14T06:00:00Z"));
    const [refreshed] = readIcsEvents(generateIcsEvents([calendarSession()]));

    expect(first.UID).toBeTruthy();
    expect(refreshed.UID).toBe(first.UID);
  });

  it("preserves the public UID format across releases and folded ICS lines", () => {
    const body = generateIcsEvents([calendarSession()]);
    expect(body).toContain("\r\n\t");
    expect(readIcsEvents(body)[0].UID).toBe(
      "wind-calendar-v1/beit-yanai/1781499600000/1781510400000@wind-calendar.vercel.app",
    );
  });

  it("keeps identity when weather, match type, labels and display timezone change", () => {
    const session = calendarSession();
    const changed = calendarSession({
      location: { ...session.location, label: "Renamed spot", tz: "UTC" },
      windMin: 20,
      windMax: 22,
      gustMax: 30,
      dominantDirection: "N",
      waveAvg: 2,
      wavePeriodAvg: 12,
      waveDominantDirection: "SW",
      matchType: "both",
      conditions: session.conditions.map((condition) => ({
        ...condition,
        windSpeed: 22,
        windGusts: 30,
        windDirection: 0,
        waveHeight: 2,
        wavePeriod: 12,
      })),
    });
    const [first] = readIcsEvents(generateIcsEvents([session]));
    const [updated] = readIcsEvents(generateIcsEvents([changed]));
    expect(updated.UID).toBe(first.UID);
    expect(updated.SUMMARY).not.toBe(first.SUMMARY);
    expect(updated.DESCRIPTION).not.toBe(first.DESCRIPTION);
  });

  it.each([
    ["spot", { location: { id: "tel-aviv", label: "Tel Aviv", tz: "Asia/Jerusalem" } }],
    ["start", { start: new Date("2026-06-15T06:00:00Z") }],
    ["end", { end: new Date("2026-06-15T09:00:00Z") }],
  ])("uses a different UID for a different %s", (_, overrides) => {
    const entries = readIcsEvents(
      generateIcsEvents([calendarSession(), calendarSession(overrides)]),
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].UID).toBeTruthy();
    expect(entries[1].UID).toBeTruthy();
    expect(entries[1].UID).not.toBe(entries[0].UID);
  });

  it("keeps identity independent of event ordering", () => {
    const sessions = [
      calendarSession(),
      calendarSession({ start: new Date("2026-06-15T06:00:00Z") }),
    ];
    const original = readIcsEvents(generateIcsEvents(sessions));
    const reordered = readIcsEvents(generateIcsEvents([...sessions].reverse()));
    expect(reordered.map((event) => event.UID)).toEqual(
      original.map((event) => event.UID).reverse(),
    );
  });

  it("keeps identity after the generator module is reloaded", async () => {
    const [first] = readIcsEvents(generateIcsEvents([calendarSession()]));
    vi.resetModules();
    const fresh = await import("../../../server/utils/generateIcsEvents");
    expect(readIcsEvents(fresh.generateIcsEvents([calendarSession()]))[0].UID).toBe(first.UID);
  });
});
