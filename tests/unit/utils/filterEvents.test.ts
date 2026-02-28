import { test } from "vitest";
import { assert, expect } from "vitest";
import { filterEvents, FilterConfig } from "../../../server/utils/filterEvents";
import { WindConditionRaw } from "../../../server/types/wind-conditions";

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

test("filterEvents", async (t) => {
  // 1. Timezone-aware: UTC 05:00 -> Asia/Jerusalem hour 7 (UTC+2 in winter) -> passes sunrise=07:00
  await t.test("keeps event when local hour falls within daylight range", () => {
    // 2024-01-01 is winter in Israel -> UTC+2, so UTC 05:00 = local 07:00
    const events = [makeEvent({ date: new Date("2099-01-01T05:00:00Z") })];
    const result = filterEvents(events, baseConfig);
    assert.equal(result.length, 1);
  });

  // 2. Timezone-aware: UTC 03:00 -> Asia/Jerusalem hour 5 in winter -> fails sunrise=07:00
  await t.test("filters out event when local hour is before daylight range", () => {
    const events = [makeEvent({ date: new Date("2099-01-01T03:00:00Z") })];
    const result = filterEvents(events, baseConfig);
    assert.equal(result.length, 0);
  });

  // 3. windMin filtering: windSpeed 8 with windMin=10 -> filtered out
  await t.test("filters out events below windMin", () => {
    const events = [makeEvent({ windSpeed: 8 })];
    const result = filterEvents(events, baseConfig);
    assert.equal(result.length, 0);
  });

  // 4. windMax filtering: windSpeed 35 with windMax=30 -> filtered out
  await t.test("filters out events above windMax", () => {
    const events = [makeEvent({ windSpeed: 35 })];
    const result = filterEvents(events, baseConfig);
    assert.equal(result.length, 0);
  });

  // 5. windMax does NOT filter gusts: windSpeed 15 with gusts 35, windMax=30 -> KEPT
  await t.test("keeps events where gusts exceed windMax", () => {
    const events = [makeEvent({ windSpeed: 15, windGusts: 35 })];
    const result = filterEvents(events, baseConfig);
    assert.equal(result.length, 1);
    assert.equal(result[0].windGusts, 35);
  });

  // 6. Future-only: past dates filtered out
  await t.test("filters out past events", () => {
    const events = [makeEvent({ date: new Date("2000-06-15T10:00:00Z") })];
    const result = filterEvents(events, baseConfig);
    assert.equal(result.length, 0);
  });

  // 7. Future-only: future dates kept
  await t.test("keeps future events", () => {
    const events = [makeEvent({ date: new Date("2099-06-15T10:00:00Z") })];
    const result = filterEvents(events, baseConfig);
    assert.equal(result.length, 1);
  });

  // 8. Null windSpeed filtered out
  await t.test("filters out events with null windSpeed", () => {
    const events = [makeEvent({ windSpeed: null })];
    const result = filterEvents(events, baseConfig);
    assert.equal(result.length, 0);
  });

  // 9. Boundary: windSpeed exactly equals windMin -> kept
  await t.test("keeps events where windSpeed equals windMin", () => {
    const events = [makeEvent({ windSpeed: 10 })];
    const result = filterEvents(events, baseConfig);
    assert.equal(result.length, 1);
  });

  // 10. Boundary: hour exactly equals sunrise -> kept; hour exactly equals sunset -> filtered (exclusive end)
  await t.test("hours boundary: start inclusive, end exclusive", () => {
    // sunrise=07:00 inclusive: UTC 05:00 in winter Israel = local 07:00 -> kept
    const keptEvent = makeEvent({
      date: new Date("2099-01-01T05:00:00Z"),
    });
    // sunset=18:00 exclusive: UTC 16:00 in winter Israel = local 18:00 -> filtered
    const filteredEvent = makeEvent({
      date: new Date("2099-01-01T16:00:00Z"),
    });

    const result = filterEvents([keptEvent, filteredEvent], baseConfig);
    assert.equal(result.length, 1);
    assert.equal(result[0].date.toISOString(), "2099-01-01T05:00:00.000Z");
  });
});
