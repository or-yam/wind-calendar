import { test } from "vitest";
import { assert } from "vitest";
import { groupSessions, degreesToCardinal } from "../../../server/utils/groupSessions";
import type { WindConditionRaw } from "../../../server/types/wind-conditions";

const BASE = new Date("2024-06-15T06:00:00Z");

function makeCondition(
  hourOffset: number,
  windSpeed: number,
  windGusts: number,
  windDirection: number,
  waveHeight: number | null = null,
): WindConditionRaw {
  return {
    date: new Date(BASE.getTime() + hourOffset * 3_600_000),
    windSpeed,
    windGusts,
    windDirection,
    waveHeight,
  };
}

test("groupSessions", async (t) => {
  await t.test("3 consecutive hours → 1 session", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180),
      makeCondition(1, 15, 20, 180),
      makeCondition(2, 15, 20, 180),
    ];
    const sessions = groupSessions(conditions, 1);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].start.toISOString(), BASE.toISOString());
    assert.equal(
      sessions[0].end.toISOString(),
      new Date(BASE.getTime() + 3 * 3_600_000).toISOString(),
    );
    assert.equal(sessions[0].conditions.length, 3);
  });

  await t.test("gap > 3h in middle → 2 sessions", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180),
      makeCondition(1, 15, 20, 180),
      makeCondition(5, 15, 20, 180),
      makeCondition(6, 15, 20, 180),
    ];
    const sessions = groupSessions(conditions, 1);
    assert.equal(sessions.length, 2);
    assert.equal(sessions[0].conditions.length, 2);
    assert.equal(sessions[1].conditions.length, 2);
  });

  await t.test("single hour discarded with minSessionHours=2", () => {
    const conditions = [makeCondition(0, 15, 20, 180)];
    const sessions = groupSessions(conditions, 2);
    assert.equal(sessions.length, 0);
  });

  await t.test("2 consecutive hours kept with minSessionHours=2", () => {
    const conditions = [makeCondition(0, 15, 20, 180), makeCondition(1, 15, 20, 180)];
    const sessions = groupSessions(conditions, 2);
    assert.equal(sessions.length, 1);
  });

  await t.test("wind range computed correctly", () => {
    const conditions = [
      makeCondition(0, 12, 20, 180),
      makeCondition(1, 17, 20, 180),
      makeCondition(2, 14, 20, 180),
    ];
    const sessions = groupSessions(conditions, 1);
    assert.equal(sessions[0].windMin, 12);
    assert.equal(sessions[0].windMax, 17);
  });

  await t.test("gustMax computed correctly", () => {
    const conditions = [
      makeCondition(0, 15, 15, 180),
      makeCondition(1, 15, 20, 180),
      makeCondition(2, 15, 18, 180),
    ];
    const sessions = groupSessions(conditions, 1);
    assert.equal(sessions[0].gustMax, 20);
  });

  await t.test("dominant direction picks most frequent", () => {
    const conditions = [
      makeCondition(0, 15, 20, 0),
      makeCondition(1, 15, 20, 0),
      makeCondition(2, 15, 20, 90),
    ];
    const sessions = groupSessions(conditions, 1);
    assert.equal(sessions[0].dominantDirection, "N");
  });

  await t.test("empty input → empty output", () => {
    const sessions = groupSessions([], 1);
    assert.equal(sessions.length, 0);
  });

  await t.test("unsorted input gets sorted", () => {
    const conditions = [
      makeCondition(2, 15, 20, 180),
      makeCondition(0, 15, 20, 180),
      makeCondition(1, 15, 20, 180),
    ];
    const sessions = groupSessions(conditions, 1);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].start.toISOString(), BASE.toISOString());
    assert.equal(
      sessions[0].end.toISOString(),
      new Date(BASE.getTime() + 3 * 3_600_000).toISOString(),
    );
  });

  await t.test("3-hourly data grouped into single session", () => {
    // Simulate 3-hourly forecast points: offsets 24, 27, 30
    const conditions = [
      makeCondition(24, 15, 20, 180),
      makeCondition(27, 15, 20, 180),
      makeCondition(30, 15, 20, 180),
    ];
    const sessions = groupSessions(conditions, 1);
    assert.equal(sessions.length, 1);
    // End = last point (30h) + 3h step = 33h
    assert.equal(
      sessions[0].end.toISOString(),
      new Date(BASE.getTime() + 33 * 3_600_000).toISOString(),
    );
  });

  await t.test("3-hourly session meets minSessionHours by time span", () => {
    // 2 points at 3h apart = 6h span, should pass minSessionHours=2
    const conditions = [makeCondition(24, 15, 20, 180), makeCondition(27, 15, 20, 180)];
    const sessions = groupSessions(conditions, 2);
    assert.equal(sessions.length, 1);
  });

  await t.test("mixed hourly then 3-hourly stays one session", () => {
    // Hourly: 21,22,23 then 3-hourly: 24,27
    const conditions = [
      makeCondition(21, 15, 20, 180),
      makeCondition(22, 15, 20, 180),
      makeCondition(23, 15, 20, 180),
      makeCondition(24, 15, 20, 180),
      makeCondition(27, 15, 20, 180),
    ];
    const sessions = groupSessions(conditions, 1);
    assert.equal(sessions.length, 1);
    // End = 27h + 3h (last step) = 30h
    assert.equal(
      sessions[0].end.toISOString(),
      new Date(BASE.getTime() + 30 * 3_600_000).toISOString(),
    );
  });

  await t.test("gap > 3h splits into separate sessions", () => {
    // 4h gap between points should split
    const conditions = [makeCondition(0, 15, 20, 180), makeCondition(4, 15, 20, 180)];
    const sessions = groupSessions(conditions, 1);
    assert.equal(sessions.length, 2);
  });

  await t.test("waveAvg calculated correctly from conditions", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180, 1.0),
      makeCondition(1, 15, 20, 180, 1.5),
      makeCondition(2, 15, 20, 180, 2.0),
    ];
    const sessions = groupSessions(conditions, 1);
    assert.equal(sessions[0].waveAvg, 1.5);
  });

  await t.test("waveAvg handles null wave heights", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180, 1.0),
      makeCondition(1, 15, 20, 180, null),
      makeCondition(2, 15, 20, 180, 2.0),
    ];
    const sessions = groupSessions(conditions, 1);
    assert.equal(sessions[0].waveAvg, 1.5); // (1.0 + 2.0) / 2
  });

  await t.test("waveAvg is 0 when all wave heights are null", () => {
    const conditions = [
      makeCondition(0, 15, 20, 180, null),
      makeCondition(1, 15, 20, 180, null),
      makeCondition(2, 15, 20, 180, null),
    ];
    const sessions = groupSessions(conditions, 1);
    assert.equal(sessions[0].waveAvg, 0);
  });
});

test("degreesToCardinal", async (t) => {
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
    await t.test(`${deg}° → ${expected}`, () => {
      assert.equal(degreesToCardinal(deg), expected);
    });
  }
});
