import type { LocationSession } from "../../server/utils/location-sessions";

export function calendarSession(overrides: Partial<LocationSession> = {}): LocationSession {
  return {
    location: { id: "beit-yanai", label: "Beit Yanai", tz: "Asia/Jerusalem" },
    start: new Date("2026-06-15T05:00:00Z"),
    end: new Date("2026-06-15T08:00:00Z"),
    windMin: 18,
    windMax: 18,
    gustMax: 24,
    dominantDirection: "NW",
    waveAvg: 1,
    wavePeriodAvg: 8,
    waveDominantDirection: "N",
    swellHeightAvg: 0,
    swellPeriodAvg: 0,
    matchType: "wind",
    conditions: [5, 6, 7].map((hour) => ({
      date: new Date(`2026-06-15T0${hour}:00:00Z`),
      windSpeed: 18,
      windGusts: 24,
      windDirection: 315,
      waveHeight: 1,
      wavePeriod: 8,
      waveDirection: 0,
      swellHeight: null,
      swellPeriod: null,
      swellDirection: null,
    })),
    ...overrides,
  };
}
