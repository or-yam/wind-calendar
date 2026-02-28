import { test } from "vitest";
import { assert } from "vitest";
import { generateIcsEvents } from "../../../server/utils/generateIcsEvents";
import type { Session } from "../../../server/utils/groupSessions";

const TZ = "Asia/Jerusalem";

function makeSession(
  startHourOffset: number,
  numHours: number,
  windMin: number,
  windMax: number,
  gustMax: number,
  direction: string,
  waveAvg: number = 0,
): Session {
  const base = new Date("2024-06-15T05:00:00Z"); // 08:00 in Asia/Jerusalem
  const start = new Date(base.getTime() + startHourOffset * 3600000);
  const end = new Date(start.getTime() + numHours * 3600000);
  const conditions = Array.from({ length: numHours }, (_, i) => ({
    date: new Date(start.getTime() + i * 3600000),
    windSpeed: windMin + Math.floor(Math.random() * (windMax - windMin + 1)),
    windGusts: gustMax,
    windDirection: direction === "NW" ? 315 : 0,
    waveHeight: waveAvg > 0 ? waveAvg : null,
  }));
  return {
    start,
    end,
    windMin,
    windMax,
    gustMax,
    dominantDirection: direction,
    waveAvg,
    conditions,
  };
}

test("generateIcsEvents", async (t) => {
  const WAVE_MIN = 0.4;

  await t.test("single session -> 1 event in ICS output", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ, WAVE_MIN);
    const count = (ics.match(/BEGIN:VEVENT/g) || []).length;
    assert.equal(count, 1);
  });

  await t.test("title format: Wind prefix with range", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ, WAVE_MIN);
    assert.ok(ics.includes("Wind 12-17kn NW"), "should contain 'Wind 12-17kn NW'");
  });

  await t.test("title format: Wind prefix with single value", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 15, 15, 20, "NW")], TZ, WAVE_MIN);
    assert.ok(ics.includes("Wind 15kn NW"), "should contain 'Wind 15kn NW'");
    assert.ok(!ics.includes("15-15kn"), "should not contain '15-15kn'");
  });

  await t.test("title format: rounds wind speeds", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12.4, 17.8, 22, "NW")], TZ, WAVE_MIN);
    assert.ok(ics.includes("Wind 12-18kn NW"), "should round 12.4 to 12 and 17.8 to 18");
  });

  await t.test("title includes wave height when > threshold", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW", 1.2)], TZ, WAVE_MIN);
    assert.ok(ics.includes("Wind 12-17kn NW | 1.2m waves"), "should include wave height");
  });

  await t.test("title excludes wave height when <= threshold", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW", 0.3)], TZ, WAVE_MIN);
    assert.ok(ics.includes("Wind 12-17kn NW"), "should contain basic title");
    assert.ok(!ics.includes("waves"), "should not include wave height");
  });

  await t.test("title excludes wave height when exactly at threshold", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW", 0.4)], TZ, WAVE_MIN);
    assert.ok(ics.includes("Wind 12-17kn NW"), "should contain basic title");
    assert.ok(!ics.includes("waves"), "should not include wave height at threshold");
  });

  await t.test("description contains hourly breakdown", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ, WAVE_MIN);
    assert.ok(ics.includes("kn"), "should contain 'kn'");
    assert.ok(ics.includes("gusts"), "should contain 'gusts'");
  });

  await t.test("multiple sessions -> multiple events", () => {
    const sessions = [makeSession(0, 3, 12, 17, 22, "NW"), makeSession(6, 2, 10, 14, 18, "N")];
    const ics = generateIcsEvents(sessions, TZ, WAVE_MIN);
    const count = (ics.match(/BEGIN:VEVENT/g) || []).length;
    assert.equal(count, 2);
  });

  await t.test("ICS output is valid", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ, WAVE_MIN);
    assert.ok(ics.startsWith("BEGIN:VCALENDAR"), "should start with BEGIN:VCALENDAR");
    assert.ok(ics.trimEnd().endsWith("END:VCALENDAR"), "should end with END:VCALENDAR");
  });
});
