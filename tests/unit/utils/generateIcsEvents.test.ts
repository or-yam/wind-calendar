import { describe, it, expect } from "vitest";
import { generateIcsEvents } from "../../../server/utils/generateIcsEvents";
import type { Session } from "../../../server/utils/groupSessions";
import type { MatchReason } from "../../../server/utils/filterEvents";

const TZ = "Asia/Jerusalem";

function makeSession(
  startHourOffset: number,
  numHours: number,
  windMin: number,
  windMax: number,
  gustMax: number,
  direction: string,
  overrides: Partial<Session> = {},
): Session {
  const base = new Date("2024-06-15T05:00:00Z"); // 08:00 in Asia/Jerusalem
  const start = new Date(base.getTime() + startHourOffset * 3600000);
  const end = new Date(start.getTime() + numHours * 3600000);
  const conditions = Array.from({ length: numHours }, (_, i) => ({
    date: new Date(start.getTime() + i * 3600000),
    windSpeed: windMin + Math.floor(Math.random() * (windMax - windMin + 1)),
    windGusts: gustMax,
    windDirection: direction === "NW" ? 315 : 0,
    waveHeight: overrides.waveAvg ?? null,
    wavePeriod: overrides.wavePeriodAvg ?? null,
    waveDirection: null,
    swellHeight: null,
    swellPeriod: null,
    swellDirection: null,
  }));
  return {
    start,
    end,
    windMin,
    windMax,
    gustMax,
    dominantDirection: direction,
    waveAvg: 0,
    wavePeriodAvg: 0,
    waveDominantDirection: "N",
    swellHeightAvg: 0,
    swellPeriodAvg: 0,
    matchType: "wind" as MatchReason,
    conditions,
    ...overrides,
  };
}

describe("generateIcsEvents", () => {
  it("single session -> 1 event in ICS output", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ);
    const count = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(count).toBe(1);
  });

  it("title format: Wind prefix with range", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ);
    expect(ics).toContain("Wind 12-17kn NW");
  });

  it("title format: Wind prefix with single value", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 15, 15, 20, "NW")], TZ);
    expect(ics).toContain("Wind 15kn NW");
    expect(ics).not.toContain("15-15kn");
  });

  it("title format: rounds wind speeds", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12.4, 17.8, 22, "NW")], TZ);
    expect(ics).toContain("Wind 12-18kn NW");
  });

  it("wind+wave title includes wave data (both matchType)", () => {
    const ics = generateIcsEvents(
      [
        makeSession(0, 3, 12, 17, 22, "NW", {
          matchType: "both",
          waveAvg: 1.2,
          wavePeriodAvg: 10,
        }),
      ],
      TZ,
    );
    expect(ics).toContain("Wind 12-17kn NW | 1.2m 10s waves");
  });

  it("wave-only title shows wave data", () => {
    const ics = generateIcsEvents(
      [
        makeSession(0, 3, 0, 0, 0, "N", {
          matchType: "wave",
          waveAvg: 1.5,
          wavePeriodAvg: 12,
          waveDominantDirection: "SW",
        }),
      ],
      TZ,
    );
    expect(ics).toContain("Waves 1.5m 12s SW");
  });

  it("wind-only title shows wind data only", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 15, 20, 25, "NW", { matchType: "wind" })], TZ);
    expect(ics).toContain("Wind 15-20kn NW");
    expect(ics).not.toContain("waves");
    expect(ics).not.toContain("Waves");
  });

  it("description contains hourly breakdown", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ);
    expect(ics).toContain("kn");
    expect(ics).toContain("gusts");
  });

  it("description includes wave data when available", () => {
    const ics = generateIcsEvents(
      [
        makeSession(0, 3, 12, 17, 22, "NW", {
          matchType: "both",
          waveAvg: 1.2,
          wavePeriodAvg: 10,
        }),
      ],
      TZ,
    );
    expect(ics).toContain("waves");
  });

  it("multiple sessions -> multiple events", () => {
    const sessions = [makeSession(0, 3, 12, 17, 22, "NW"), makeSession(6, 2, 10, 14, 18, "N")];
    const ics = generateIcsEvents(sessions, TZ);
    const count = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(count).toBe(2);
  });

  it("ICS output is valid", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ);
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("calendar name is 'Forecast'", () => {
    const ics = generateIcsEvents([makeSession(0, 3, 12, 17, 22, "NW")], TZ);
    expect(ics).toContain("X-WR-CALNAME:Forecast");
  });
});
