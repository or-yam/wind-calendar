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

function hourlySession(id: string, startHour: number, windSpeeds: number[]): LocationSession {
  const start = new Date(`2030-06-15T${startHour}:00:00Z`);
  const conditions = windSpeeds.map((windSpeed, index) => ({
    date: new Date(start.getTime() + index * 3_600_000),
    windSpeed,
    windGusts: windSpeed + 3,
    windDirection: 270,
    waveHeight: 1,
    wavePeriod: 10,
    waveDirection: 270,
    swellHeight: 1,
    swellPeriod: 10,
    swellDirection: 270,
  }));

  return {
    ...session(id, Math.max(...windSpeeds), 1, startHour),
    start,
    end: new Date(start.getTime() + windSpeeds.length * 3_600_000),
    windMin: Math.min(...windSpeeds),
    windMax: Math.max(...windSpeeds),
    conditions,
  };
}

describe("selectBestLocationSessions", () => {
  it("uses wind when wind and wave rankings conflict", () => {
    const result = selectBestLocationSessions(
      [session("tel-aviv", 20, 1), session("herzliya", 18, 2)],
      config,
    );
    expect(result.map(({ location }) => location.id)).toEqual(["tel-aviv"]);
  });

  it("uses wave height for wave-only matching", () => {
    const result = selectBestLocationSessions(
      [session("tel-aviv", 20, 1), session("herzliya", 18, 2)],
      { ...config, windEnabled: false },
    );
    expect(result.map(({ location }) => location.id)).toEqual(["herzliya"]);
  });

  it("uses wave height when overlapping intervals both qualify only by waves", () => {
    const telAviv = session("tel-aviv", 20, 1);
    const herzliya = session("herzliya", 18, 2);
    telAviv.matchType = "wave";
    herzliya.matchType = "wave";

    const result = selectBestLocationSessions([telAviv, herzliya], config);

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

  it("preserves the non-overlapping remainder of a losing session", () => {
    const result = selectBestLocationSessions(
      [hourlySession("tel-aviv", 10, [25, 25]), hourlySession("herzliya", 11, [20, 20, 20, 20])],
      config,
    );

    expect(
      result.map(({ location, start, end }) => ({
        location: location.id,
        start: start.toISOString(),
        end: end.toISOString(),
      })),
    ).toEqual([
      {
        location: "tel-aviv",
        start: "2030-06-15T10:00:00.000Z",
        end: "2030-06-15T12:00:00.000Z",
      },
      {
        location: "herzliya",
        start: "2030-06-15T12:00:00.000Z",
        end: "2030-06-15T15:00:00.000Z",
      },
    ]);
  });

  it("does not let an earlier wind peak decide later intervals", () => {
    const result = selectBestLocationSessions(
      [hourlySession("tel-aviv", 10, [30, 10, 10]), hourlySession("herzliya", 10, [20, 20, 20])],
      config,
    );

    expect(
      result.map(({ location, start, end }) => ({
        location: location.id,
        start: start.toISOString(),
        end: end.toISOString(),
      })),
    ).toEqual([
      {
        location: "tel-aviv",
        start: "2030-06-15T10:00:00.000Z",
        end: "2030-06-15T11:00:00.000Z",
      },
      {
        location: "herzliya",
        start: "2030-06-15T11:00:00.000Z",
        end: "2030-06-15T13:00:00.000Z",
      },
    ]);
  });
});
