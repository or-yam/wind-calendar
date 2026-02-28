import { describe, it, expect } from "vitest";
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

describe("generateIcsEvents", () => {
  const WAVE_MIN = 0.4;

  it("single session -> 1 event in ICS output", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ, WAVE_MIN);
    const count = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(count).toBe(1);
  });

  it("title format: Wind prefix with range", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ, WAVE_MIN);
    expect(ics).toContain("Wind 12-17kn NW");
  });

  it("title format: Wind prefix with single value", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 15, 15, 20, "NW")], TZ, WAVE_MIN);
    expect(ics).toContain("Wind 15kn NW");
    expect(ics).not.toContain("15-15kn");
  });

  it("title format: rounds wind speeds", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12.4, 17.8, 22, "NW")], TZ, WAVE_MIN);
    expect(ics).toContain("Wind 12-18kn NW");
  });

  it("title includes wave height when > threshold", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW", 1.2)], TZ, WAVE_MIN);
    expect(ics).toContain("Wind 12-17kn NW | 1.2m waves");
  });

  it("title excludes wave height when <= threshold", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW", 0.3)], TZ, WAVE_MIN);
    expect(ics).toContain("Wind 12-17kn NW");
    expect(ics).not.toContain("waves");
  });

  it("title excludes wave height when exactly at threshold", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW", 0.4)], TZ, WAVE_MIN);
    expect(ics).toContain("Wind 12-17kn NW");
    expect(ics).not.toContain("waves");
  });

  it("description contains hourly breakdown", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ, WAVE_MIN);
    expect(ics).toContain("kn");
    expect(ics).toContain("gusts");
  });

  it("multiple sessions -> multiple events", () => {
    const sessions = [makeSession(0, 3, 12, 17, 22, "NW"), makeSession(6, 2, 10, 14, 18, "N")];
    const ics = generateIcsEvents(sessions, TZ, WAVE_MIN);
    const count = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(count).toBe(2);
  });

  it("ICS output is valid", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ, WAVE_MIN);
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });
});
