import { describe, it, expect } from "vitest";
import { groupSessions, degreesToCardinal } from "../../../server/utils/groupSessions";
import type { WindConditionRaw } from "../../../server/types/wind-conditions";
import type { MatchReason } from "../../../server/utils/filterEvents";

const BASE = new Date("2024-06-15T06:00:00Z");

function makeCondition(
  hourOffset: number,
  windSpeed: number,
  windGusts: number,
  windDirection: number,
  waveHeight: number | null = null,
  extra: Partial<WindConditionRaw> = {},
): WindConditionRaw {
  return {
    date: new Date(BASE.getTime() + hourOffset * 3_600_000),
    windSpeed,
    windGusts,
    windDirection,
    waveHeight,
    wavePeriod: null,
    waveDirection: null,
    swellHeight: null,
    swellPeriod: null,
    swellDirection: null,
    ...extra,
  };
}

/** Helper to create a matchReasons map with all conditions mapped to a reason */
function makeReasons(
  conditions: WindConditionRaw[],
  reason: MatchReason = "wind",
): Map<WindConditionRaw, MatchReason> {
  return new Map(conditions.map((c) => [c, reason]));
}

describe("groupSessions", () => {
  it("3 consecutive hours -> 1 session", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180),
      makeCondition(1, 15, 20, 180),
      makeCondition(2, 15, 20, 180),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions.length).toBe(1);
    expect(sessions[0].start.toISOString()).toBe(BASE.toISOString());
    expect(sessions[0].end.toISOString()).toBe(
      new Date(BASE.getTime() + 3 * 3_600_000).toISOString(),
    );
    expect(sessions[0].conditions.length).toBe(3);
  });

  it("gap > 3h in middle -> 2 sessions", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180),
      makeCondition(1, 15, 20, 180),
      makeCondition(5, 15, 20, 180),
      makeCondition(6, 15, 20, 180),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions.length).toBe(2);
    expect(sessions[0].conditions.length).toBe(2);
    expect(sessions[1].conditions.length).toBe(2);
  });

  it("single hour discarded with minSessionHours=2", () => {
    const conditions = [makeCondition(0, 15, 20, 180)];
    const sessions = groupSessions(conditions, makeReasons(conditions), 2);
    expect(sessions.length).toBe(0);
  });

  it("2 consecutive hours kept with minSessionHours=2", () => {
    const conditions = [makeCondition(0, 15, 20, 180), makeCondition(1, 15, 20, 180)];
    const sessions = groupSessions(conditions, makeReasons(conditions), 2);
    expect(sessions.length).toBe(1);
  });

  it("wind range computed correctly", () => {
    const conditions = [
      makeCondition(0, 12, 20, 180),
      makeCondition(1, 17, 20, 180),
      makeCondition(2, 14, 20, 180),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions[0].windMin).toBe(12);
    expect(sessions[0].windMax).toBe(17);
  });

  it("gustMax computed correctly", () => {
    const conditions = [
      makeCondition(0, 15, 15, 180),
      makeCondition(1, 15, 20, 180),
      makeCondition(2, 15, 18, 180),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions[0].gustMax).toBe(20);
  });

  it("dominant direction picks most frequent", () => {
    const conditions = [
      makeCondition(0, 15, 20, 0),
      makeCondition(1, 15, 20, 0),
      makeCondition(2, 15, 20, 90),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions[0].dominantDirection).toBe("N");
  });

  it("empty input -> empty output", () => {
    const sessions = groupSessions([], new Map(), 1);
    expect(sessions.length).toBe(0);
  });

  it("unsorted input gets sorted", () => {
    const conditions = [
      makeCondition(2, 15, 20, 180),
      makeCondition(0, 15, 20, 180),
      makeCondition(1, 15, 20, 180),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions.length).toBe(1);
    expect(sessions[0].start.toISOString()).toBe(BASE.toISOString());
    expect(sessions[0].end.toISOString()).toBe(
      new Date(BASE.getTime() + 3 * 3_600_000).toISOString(),
    );
  });

  it("3-hourly data grouped into single session", () => {
    const conditions = [
      makeCondition(24, 15, 20, 180),
      makeCondition(27, 15, 20, 180),
      makeCondition(30, 15, 20, 180),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions.length).toBe(1);
    expect(sessions[0].end.toISOString()).toBe(
      new Date(BASE.getTime() + 33 * 3_600_000).toISOString(),
    );
  });

  it("3-hourly session meets minSessionHours by time span", () => {
    const conditions = [makeCondition(24, 15, 20, 180), makeCondition(27, 15, 20, 180)];
    const sessions = groupSessions(conditions, makeReasons(conditions), 2);
    expect(sessions.length).toBe(1);
  });

  it("mixed hourly then 3-hourly stays one session", () => {
    const conditions = [
      makeCondition(21, 15, 20, 180),
      makeCondition(22, 15, 20, 180),
      makeCondition(23, 15, 20, 180),
      makeCondition(24, 15, 20, 180),
      makeCondition(27, 15, 20, 180),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions.length).toBe(1);
    expect(sessions[0].end.toISOString()).toBe(
      new Date(BASE.getTime() + 30 * 3_600_000).toISOString(),
    );
  });

  it("gap > 3h splits into separate sessions", () => {
    const conditions = [makeCondition(0, 15, 20, 180), makeCondition(4, 15, 20, 180)];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions.length).toBe(2);
  });

  it("waveAvg calculated correctly from conditions", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180, 1.0),
      makeCondition(1, 15, 20, 180, 1.5),
      makeCondition(2, 15, 20, 180, 2.0),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions[0].waveAvg).toBe(1.5);
  });

  it("waveAvg handles null wave heights", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180, 1.0),
      makeCondition(1, 15, 20, 180, null),
      makeCondition(2, 15, 20, 180, 2.0),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions[0].waveAvg).toBe(1.5);
  });

  it("waveAvg is 0 when all wave heights are null", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180, null),
      makeCondition(1, 15, 20, 180, null),
      makeCondition(2, 15, 20, 180, null),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions[0].waveAvg).toBe(0);
  });

  // --- New: wave aggregates ---

  it("wavePeriodAvg computed from conditions", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180, 1.0, { wavePeriod: 10 }),
      makeCondition(1, 15, 20, 180, 1.0, { wavePeriod: 12 }),
      makeCondition(2, 15, 20, 180, 1.0, { wavePeriod: 14 }),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions[0].wavePeriodAvg).toBe(12);
  });

  it("waveDominantDirection picks most frequent wave direction", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180, 1.0, { waveDirection: 270 }),
      makeCondition(1, 15, 20, 180, 1.0, { waveDirection: 270 }),
      makeCondition(2, 15, 20, 180, 1.0, { waveDirection: 0 }),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions[0].waveDominantDirection).toBe("W");
  });

  it("swellHeightAvg computed from conditions", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180, null, { swellHeight: 1.0 }),
      makeCondition(1, 15, 20, 180, null, { swellHeight: 2.0 }),
    ];
    const sessions = groupSessions(conditions, makeReasons(conditions), 1);
    expect(sessions[0].swellHeightAvg).toBe(1.5);
  });

  // --- New: matchType ---

  it("matchType is 'wind' when all conditions match wind", () => {
    const conditions = [makeCondition(0, 15, 20, 180), makeCondition(1, 15, 20, 180)];
    const sessions = groupSessions(conditions, makeReasons(conditions, "wind"), 1);
    expect(sessions[0].matchType).toBe("wind");
  });

  it("matchType is 'wave' when all conditions match wave", () => {
    const conditions = [makeCondition(0, 15, 20, 180, 1.5), makeCondition(1, 15, 20, 180, 1.5)];
    const sessions = groupSessions(conditions, makeReasons(conditions, "wave"), 1);
    expect(sessions[0].matchType).toBe("wave");
  });

  it("matchType change breaks session into separate sessions", () => {
    const c1 = makeCondition(0, 15, 20, 180);
    const c2 = makeCondition(1, 15, 20, 180, 1.5);
    const reasons = new Map<WindConditionRaw, MatchReason>([
      [c1, "wind"],
      [c2, "wave"],
    ]);
    const sessions = groupSessions([c1, c2], reasons, 1);
    // Should create 2 separate sessions (wind + wave)
    expect(sessions).toHaveLength(2);
    expect(sessions[0].matchType).toBe("wind");
    expect(sessions[1].matchType).toBe("wave");
  });

  it("matchType is 'both' when any condition has 'both' reason", () => {
    const conditions = [makeCondition(0, 15, 20, 180, 1.5), makeCondition(1, 15, 20, 180, 1.5)];
    const sessions = groupSessions(conditions, makeReasons(conditions, "both"), 1);
    expect(sessions[0].matchType).toBe("both");
  });

  it("wave-only session discarded if < minSessionHours", () => {
    // 1 hour of waves, low wind
    const c1 = makeCondition(0, 5, 10, 0, 1.5, { wavePeriod: 10 });
    const reasons = new Map([[c1, "wave" as MatchReason]]);
    const sessions = groupSessions([c1], reasons, 2);
    expect(sessions).toHaveLength(0); // < 2 hour minimum
  });

  it("mixed: wind session passes, wave session fails minSessionHours", () => {
    // 3 hours wind, then 1 hour wave-only
    const c1 = makeCondition(0, 15, 20, 180);
    const c2 = makeCondition(1, 15, 20, 180);
    const c3 = makeCondition(2, 15, 20, 180);
    const c4 = makeCondition(3, 5, 10, 180, 1.5, { wavePeriod: 10 });

    const reasons = new Map<WindConditionRaw, MatchReason>([
      [c1, "wind"],
      [c2, "wind"],
      [c3, "wind"],
      [c4, "wave"],
    ]);

    const sessions = groupSessions([c1, c2, c3, c4], reasons, 2);
    expect(sessions).toHaveLength(1); // Only wind session
    expect(sessions[0].matchType).toBe("wind");
  });

  it("three consecutive hours with alternating matchTypes create 3 sessions", () => {
    const c1 = makeCondition(0, 15, 20, 180, null);
    const c2 = makeCondition(1, 5, 10, 180, 2.0, { wavePeriod: 10 });
    const c3 = makeCondition(2, 15, 20, 180, null);

    const reasons = new Map<WindConditionRaw, MatchReason>([
      [c1, "wind"],
      [c2, "wave"],
      [c3, "wind"],
    ]);
    const sessions = groupSessions([c1, c2, c3], reasons, 1);

    expect(sessions).toHaveLength(3);
    expect(sessions.map((s) => s.matchType)).toEqual(["wind", "wave", "wind"]);
  });

  it("matchType 'both' does NOT break sessions", () => {
    const c1 = makeCondition(0, 15, 20, 180, 1.5, { wavePeriod: 10 });
    const c2 = makeCondition(1, 15, 20, 180, 1.5, { wavePeriod: 10 });

    const reasons = new Map<WindConditionRaw, MatchReason>([
      [c1, "both"],
      [c2, "both"],
    ]);
    const sessions = groupSessions([c1, c2], reasons, 1);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].matchType).toBe("both");
  });
});

describe("degreesToCardinal", () => {
  const cases: [number, string][] = [
    [0, "N"],
    [45, "NE"],
    [90, "E"],
    [135, "SE"],
    [180, "S"],
    [225, "SW"],
    [270, "W"],
    [315, "NW"],
    [360, "N"],
  ];
  for (const [deg, expected] of cases) {
    it(`${deg}° -> ${expected}`, () => {
      expect(degreesToCardinal(deg)).toBe(expected);
    });
  }
});
