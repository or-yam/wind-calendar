import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { filterEvents, type FilterConfig } from "../../../server/utils/filterEvents";
import type { WindConditionRaw } from "../../../server/types/wind-conditions";

const baseConfig: FilterConfig = {
  windEnabled: true,
  windMin: 10,
  windMax: 30,
  waveEnabled: false,
  waveSource: "total",
  waveHeightMin: 0.5,
  waveHeightMax: 5.0,
  wavePeriodMin: 8,
  sunrise: "07:00",
  sunset: "18:00",
  tz: "Asia/Jerusalem",
};

const futureDate = new Date("2026-06-15T10:00:00Z");

const makeEvent = (overrides: Partial<WindConditionRaw> = {}): WindConditionRaw => ({
  date: futureDate,
  windSpeed: 15,
  windGusts: 20,
  windDirection: 180,
  waveHeight: null,
  wavePeriod: null,
  waveDirection: null,
  swellHeight: null,
  swellPeriod: null,
  swellDirection: null,
  ...overrides,
});

beforeEach(() => vi.setSystemTime(new Date("2026-01-01T00:00:00Z")));
afterEach(() => vi.useRealTimers());

describe("filterEvents", () => {
  it.each([
    ["before sunrise", "2026-01-02T04:14:00Z", false],
    ["at sunrise", "2026-01-02T04:15:00Z", true],
    ["before sunset", "2026-01-02T16:29:00Z", true],
    ["at sunset", "2026-01-02T16:30:00Z", false],
  ] as const)("uses minute precision %s in the spot timezone", (_, instant, admitted) => {
    const sample = makeEvent({ date: new Date(instant) });
    const { conditions } = filterEvents([sample], {
      ...baseConfig,
      sunrise: "06:15",
      sunset: "18:30",
    });
    expect(conditions).toEqual(admitted ? [sample] : []);
  });

  it("excludes samples at or before now and keeps the next qualifying instant", () => {
    vi.setSystemTime(new Date("2026-01-02T10:00:00Z"));
    const samples = ["09:59:59", "10:00:00", "10:00:01"].map((time) =>
      makeEvent({ date: new Date(`2026-01-02T${time}Z`) }),
    );
    expect(
      filterEvents(samples, baseConfig).conditions.map((sample) => sample.date.toISOString()),
    ).toEqual(["2026-01-02T10:00:01.000Z"]);
  });

  // --- Backward compat: wind-only mode (default) ---

  it("keeps event when local hour falls within daylight range", () => {
    const events = [makeEvent({ date: new Date("2026-01-01T05:00:00Z") })];
    const { conditions } = filterEvents(events, baseConfig);
    expect(conditions.length).toBe(1);
  });

  it("filters out event when local hour is before daylight range", () => {
    const events = [makeEvent({ date: new Date("2026-01-01T03:00:00Z") })];
    const { conditions } = filterEvents(events, baseConfig);
    expect(conditions.length).toBe(0);
  });

  it("filters out events below windMin", () => {
    const events = [makeEvent({ windSpeed: 8 })];
    const { conditions } = filterEvents(events, baseConfig);
    expect(conditions.length).toBe(0);
  });

  it("filters out events above windMax", () => {
    const events = [makeEvent({ windSpeed: 35 })];
    const { conditions } = filterEvents(events, baseConfig);
    expect(conditions.length).toBe(0);
  });

  it("keeps events where gusts exceed windMax", () => {
    const events = [makeEvent({ windSpeed: 15, windGusts: 35 })];
    const { conditions } = filterEvents(events, baseConfig);
    expect(conditions.length).toBe(1);
  });

  it("filters out past events", () => {
    const events = [makeEvent({ date: new Date("2000-06-15T10:00:00Z") })];
    const { conditions } = filterEvents(events, baseConfig);
    expect(conditions.length).toBe(0);
  });

  it("keeps future events", () => {
    const events = [makeEvent({ date: new Date("2026-06-15T10:00:00Z") })];
    const { conditions } = filterEvents(events, baseConfig);
    expect(conditions.length).toBe(1);
  });

  it("filters out events with null windSpeed", () => {
    const events = [makeEvent({ windSpeed: null })];
    const { conditions } = filterEvents(events, baseConfig);
    expect(conditions.length).toBe(0);
  });

  it("keeps events where windSpeed equals windMin", () => {
    const events = [makeEvent({ windSpeed: 10 })];
    const { conditions } = filterEvents(events, baseConfig);
    expect(conditions.length).toBe(1);
  });

  it("hours boundary: start inclusive, end exclusive", () => {
    const keptEvent = makeEvent({ date: new Date("2026-01-01T05:00:00Z") });
    const filteredEvent = makeEvent({ date: new Date("2026-01-01T16:00:00Z") });
    const { conditions } = filterEvents([keptEvent, filteredEvent], baseConfig);
    expect(conditions.length).toBe(1);
    expect(conditions[0].date.toISOString()).toBe("2026-01-01T05:00:00.000Z");
  });

  // --- Match reasons ---

  it("wind-only match reason is 'wind'", () => {
    const events = [makeEvent({ windSpeed: 15 })];
    const { conditions, matchReasons } = filterEvents(events, baseConfig);
    expect(matchReasons.get(conditions[0])).toBe("wind");
  });

  // --- Wave-only mode ---

  it("wave-only: filters by wave height", () => {
    const config: FilterConfig = { ...baseConfig, windEnabled: false, waveEnabled: true };
    const events = [
      makeEvent({ windSpeed: 5, waveHeight: 1.5, wavePeriod: 10 }),
      makeEvent({ windSpeed: 5, waveHeight: 0.2, wavePeriod: 10 }),
    ];
    const { conditions, matchReasons } = filterEvents(events, config);
    expect(conditions.length).toBe(1);
    expect(conditions[0].waveHeight).toBe(1.5);
    expect(matchReasons.get(conditions[0])).toBe("wave");
  });

  it("wave-only: filters by wave period min", () => {
    const config: FilterConfig = {
      ...baseConfig,
      windEnabled: false,
      waveEnabled: true,
      wavePeriodMin: 10,
    };
    const events = [
      makeEvent({ waveHeight: 1.5, wavePeriod: 12 }),
      makeEvent({ waveHeight: 1.5, wavePeriod: 6 }),
    ];
    const { conditions } = filterEvents(events, config);
    expect(conditions.length).toBe(1);
    expect(conditions[0].wavePeriod).toBe(12);
  });

  it("wave-only: filters by wave height max", () => {
    const config: FilterConfig = {
      ...baseConfig,
      windEnabled: false,
      waveEnabled: true,
      waveHeightMax: 2.0,
    };
    const events = [
      makeEvent({ waveHeight: 1.5, wavePeriod: 10 }),
      makeEvent({ waveHeight: 3.0, wavePeriod: 10 }),
    ];
    const { conditions } = filterEvents(events, config);
    expect(conditions.length).toBe(1);
    expect(conditions[0].waveHeight).toBe(1.5);
  });

  it("wave-only: null period defaults to 0 (passes when wavePeriodMin=0)", () => {
    const config: FilterConfig = {
      ...baseConfig,
      windEnabled: false,
      waveEnabled: true,
      wavePeriodMin: 0,
    };
    const events = [makeEvent({ waveHeight: 1.5, wavePeriod: null })];
    const { conditions } = filterEvents(events, config);
    expect(conditions.length).toBe(1); // null treated as 0, passes >= 0
  });

  it("wave-only: null period defaults to 0 (fails when wavePeriodMin > 0)", () => {
    const config: FilterConfig = {
      ...baseConfig,
      windEnabled: false,
      waveEnabled: true,
      wavePeriodMin: 8,
    };
    const events = [makeEvent({ waveHeight: 1.5, wavePeriod: null })];
    const { conditions } = filterEvents(events, config);
    expect(conditions.length).toBe(0); // null treated as 0, fails < 8
  });

  it("wave-only: null wave height fails", () => {
    const config: FilterConfig = { ...baseConfig, windEnabled: false, waveEnabled: true };
    const events = [makeEvent({ waveHeight: null, wavePeriod: 10 })];
    const { conditions } = filterEvents(events, config);
    expect(conditions.length).toBe(0);
  });

  it("wave-only: uses swell data when waveSource=swell", () => {
    const config: FilterConfig = {
      ...baseConfig,
      windEnabled: false,
      waveEnabled: true,
      waveSource: "swell",
    };
    const events = [makeEvent({ waveHeight: 0.3, swellHeight: 1.5, swellPeriod: 12 })];
    const { conditions } = filterEvents(events, config);
    expect(conditions.length).toBe(1);
  });

  // --- Mix mode (OR logic) ---

  it("mix: wind-only hour passes", () => {
    const config: FilterConfig = { ...baseConfig, windEnabled: true, waveEnabled: true };
    const events = [makeEvent({ windSpeed: 15, waveHeight: 0.1 })];
    const { conditions, matchReasons } = filterEvents(events, config);
    expect(conditions.length).toBe(1);
    expect(matchReasons.get(conditions[0])).toBe("wind");
  });

  it("mix: wave-only hour passes", () => {
    const config: FilterConfig = { ...baseConfig, windEnabled: true, waveEnabled: true };
    const events = [makeEvent({ windSpeed: 5, waveHeight: 1.5, wavePeriod: 10 })];
    const { conditions, matchReasons } = filterEvents(events, config);
    expect(conditions.length).toBe(1);
    expect(matchReasons.get(conditions[0])).toBe("wave");
  });

  it("mix: both pass -> reason is 'both'", () => {
    const config: FilterConfig = { ...baseConfig, windEnabled: true, waveEnabled: true };
    const events = [makeEvent({ windSpeed: 15, waveHeight: 1.5, wavePeriod: 10 })];
    const { conditions, matchReasons } = filterEvents(events, config);
    expect(conditions.length).toBe(1);
    expect(matchReasons.get(conditions[0])).toBe("both");
  });

  it("mix: neither passes -> excluded", () => {
    const config: FilterConfig = { ...baseConfig, windEnabled: true, waveEnabled: true };
    const events = [makeEvent({ windSpeed: 5, waveHeight: 0.1 })];
    const { conditions } = filterEvents(events, config);
    expect(conditions.length).toBe(0);
  });

  // --- Both disabled -> empty ---

  it("both disabled: empty result", () => {
    const config: FilterConfig = { ...baseConfig, windEnabled: false, waveEnabled: false };
    const events = [makeEvent({ windSpeed: 15, waveHeight: 1.5 })];
    const { conditions } = filterEvents(events, config);
    expect(conditions.length).toBe(0);
  });
});
