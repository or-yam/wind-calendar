import { describe, it, expect } from "vitest";
import { filterEvents, type FilterConfig } from "../../../server/utils/filterEvents";
import type { WindConditionRaw } from "../../../server/types/wind-conditions";

const baseConfig: FilterConfig = {
  windMin: 10,
  windMax: 30,
  sunrise: "07:00",
  sunset: "18:00",
  tz: "Asia/Jerusalem",
};

const futureDate = new Date("2099-06-15T10:00:00Z");

const makeEvent = (overrides: Partial<WindConditionRaw> = {}): WindConditionRaw => ({
  date: futureDate,
  windSpeed: 15,
  windGusts: 20,
  windDirection: 180,
  waveHeight: null,
  ...overrides,
});

describe("filterEvents", () => {
  // 1. Timezone-aware: UTC 05:00 -> Asia/Jerusalem hour 7 (UTC+2 in winter) -> passes sunrise=07:00
  it("keeps event when local hour falls within daylight range", () => {
    // 2024-01-01 is winter in Israel -> UTC+2, so UTC 05:00 = local 07:00
    const events = [makeEvent({ date: new Date("2099-01-01T05:00:00Z") })];
    const result = filterEvents(events, baseConfig);
    expect(result.length).toBe(1);
  });

  // 2. Timezone-aware: UTC 03:00 -> Asia/Jerusalem hour 5 in winter -> fails sunrise=07:00
  it("filters out event when local hour is before daylight range", () => {
    const events = [makeEvent({ date: new Date("2099-01-01T03:00:00Z") })];
    const result = filterEvents(events, baseConfig);
    expect(result.length).toBe(0);
  });

  // 3. windMin filtering: windSpeed 8 with windMin=10 -> filtered out
  it("filters out events below windMin", () => {
    const events = [makeEvent({ windSpeed: 8 })];
    const result = filterEvents(events, baseConfig);
    expect(result.length).toBe(0);
  });

  // 4. windMax filtering: windSpeed 35 with windMax=30 -> filtered out
  it("filters out events above windMax", () => {
    const events = [makeEvent({ windSpeed: 35 })];
    const result = filterEvents(events, baseConfig);
    expect(result.length).toBe(0);
  });

  // 5. windMax does NOT filter gusts: windSpeed 15 with gusts 35, windMax=30 -> KEPT
  it("keeps events where gusts exceed windMax", () => {
    const events = [makeEvent({ windSpeed: 15, windGusts: 35 })];
    const result = filterEvents(events, baseConfig);
    expect(result.length).toBe(1);
    expect(result[0].windGusts).toBe(35);
  });

  // 6. Future-only: past dates filtered out
  it("filters out past events", () => {
    const events = [makeEvent({ date: new Date("2000-06-15T10:00:00Z") })];
    const result = filterEvents(events, baseConfig);
    expect(result.length).toBe(0);
  });

  // 7. Future-only: future dates kept
  it("keeps future events", () => {
    const events = [makeEvent({ date: new Date("2099-06-15T10:00:00Z") })];
    const result = filterEvents(events, baseConfig);
    expect(result.length).toBe(1);
  });

  // 8. Null windSpeed filtered out
  it("filters out events with null windSpeed", () => {
    const events = [makeEvent({ windSpeed: null })];
    const result = filterEvents(events, baseConfig);
    expect(result.length).toBe(0);
  });

  // 9. Boundary: windSpeed exactly equals windMin -> kept
  it("keeps events where windSpeed equals windMin", () => {
    const events = [makeEvent({ windSpeed: 10 })];
    const result = filterEvents(events, baseConfig);
    expect(result.length).toBe(1);
  });

  // 10. Boundary: hour exactly equals sunrise -> kept; hour exactly equals sunset -> filtered (exclusive end)
  it("hours boundary: start inclusive, end exclusive", () => {
    // sunrise=07:00 inclusive: UTC 05:00 in winter Israel = local 07:00 -> kept
    const keptEvent = makeEvent({
      date: new Date("2099-01-01T05:00:00Z"),
    });
    // sunset=18:00 exclusive: UTC 16:00 in winter Israel = local 18:00 -> filtered
    const filteredEvent = makeEvent({
      date: new Date("2099-01-01T16:00:00Z"),
    });

    const result = filterEvents([keptEvent, filteredEvent], baseConfig);
    expect(result.length).toBe(1);
    expect(result[0].date.toISOString()).toBe("2099-01-01T05:00:00.000Z");
  });
});
