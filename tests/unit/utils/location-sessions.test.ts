import { describe, expect, it } from "vitest";
import type { CalendarConfig } from "../../../shared/types";
import type { LocationSession } from "../../../server/utils/location-sessions";
import { selectBestLocationSessions } from "../../../server/utils/location-sessions";

const config: CalendarConfig = {
  locations: ["tel-aviv", "herzliya"],
  model: 3,
  minSessionHours: 1,
  windEnabled: true,
  windMin: 10,
  windMax: 35,
  waveEnabled: true,
  waveSource: "total",
  waveHeightMin: 0.5,
  waveHeightMax: 5,
  wavePeriodMin: 0,
};

function session(id: string, windMax: number, waveHeight: number, startHour = 10): LocationSession {
  const start = new Date(`2030-06-15T${startHour}:00:00Z`);
  return {
    location: { id, label: id, tz: "Asia/Jerusalem" },
    start,
    end: new Date(start.getTime() + 2 * 3_600_000),
    windMin: windMax - 2,
    windMax,
    gustMax: windMax + 3,
    dominantDirection: "W",
    waveAvg: waveHeight,
    wavePeriodAvg: 10,
    waveDominantDirection: "W",
    swellHeightAvg: waveHeight,
    swellPeriodAvg: 10,
    matchType: "both",
    conditions: [
      {
        date: start,
        windSpeed: windMax,
        windGusts: windMax + 3,
        windDirection: 270,
        waveHeight,
        wavePeriod: 10,
        waveDirection: 270,
        swellHeight: waveHeight,
        swellPeriod: 10,
        swellDirection: 270,
      },
    ],
  };
}

describe("selectBestLocationSessions", () => {
  it("uses peak wind when wind and wave rankings conflict", () => {
    const result = selectBestLocationSessions(
      [session("tel-aviv", 20, 1), session("herzliya", 18, 2)],
      config,
    );
    expect(result.map(({ location }) => location.id)).toEqual(["tel-aviv"]);
  });

  it("uses peak wave for wave-only matching", () => {
    const result = selectBestLocationSessions(
      [session("tel-aviv", 20, 1), session("herzliya", 18, 2)],
      { ...config, windEnabled: false },
    );
    expect(result.map(({ location }) => location.id)).toEqual(["herzliya"]);
  });

  it("uses wave height as the wind tie-breaker", () => {
    const result = selectBestLocationSessions(
      [session("tel-aviv", 20, 1), session("herzliya", 20, 2)],
      config,
    );
    expect(result.map(({ location }) => location.id)).toEqual(["herzliya"]);
  });

  it("preserves selection order for wind-only ties", () => {
    const result = selectBestLocationSessions(
      [session("herzliya", 20, 2), session("tel-aviv", 20, 1)],
      { ...config, waveEnabled: false },
    );
    expect(result.map(({ location }) => location.id)).toEqual(["tel-aviv"]);
  });

  it("preserves selection order for exact ties", () => {
    const result = selectBestLocationSessions(
      [session("herzliya", 20, 1), session("tel-aviv", 20, 1)],
      config,
    );
    expect(result.map(({ location }) => location.id)).toEqual(["tel-aviv"]);
  });

  it("keeps non-overlapping sessions", () => {
    const result = selectBestLocationSessions(
      [session("tel-aviv", 20, 1, 10), session("herzliya", 18, 2, 13)],
      config,
    );
    expect(result).toHaveLength(2);
  });
});
