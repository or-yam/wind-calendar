import type { WindConditionRaw } from "../types/wind-conditions";
import type { MatchReason } from "./filterEvents";

export type Session = {
  start: Date;
  end: Date;
  windMin: number;
  windMax: number;
  gustMax: number;
  dominantDirection: string;
  waveAvg: number;
  wavePeriodAvg: number;
  waveDominantDirection: string;
  swellHeightAvg: number;
  swellPeriodAvg: number;
  matchType: MatchReason;
  conditions: WindConditionRaw[];
};

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const ONE_HOUR = 3_600_000;
const THREE_HOURS = 3 * ONE_HOUR;

export function degreesToCardinal(degrees: number): string {
  return CARDINALS[Math.round(degrees / 45) % 8];
}

function getDominantDirection(
  conditions: WindConditionRaw[],
  directionKey: "windDirection" | "waveDirection" | "swellDirection",
): string {
  const counts = new Map<string, number>();
  for (const c of conditions) {
    const deg = c[directionKey];
    if (deg == null) continue;
    const cardinal = degreesToCardinal(deg);
    counts.set(cardinal, (counts.get(cardinal) ?? 0) + 1);
  }

  let best = "N";
  let bestCount = 0;
  for (const [dir, count] of counts) {
    if (count > bestCount) {
      best = dir;
      bestCount = count;
    }
  }
  return best;
}

function avg(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

function getSessionMatchType(
  conditions: WindConditionRaw[],
  matchReasons: Map<WindConditionRaw, MatchReason>,
): MatchReason {
  // Sessions are homogeneous — all hours share same matchType
  // Return the matchType of the first hour
  return matchReasons.get(conditions[0]) ?? "wind";
}

function finalizeGroup(
  group: WindConditionRaw[],
  matchReasons: Map<WindConditionRaw, MatchReason>,
): Session {
  const speeds = group.map((c) => c.windSpeed).filter((s): s is number => s != null);
  const gusts = group.map((c) => c.windGusts).filter((g): g is number => g != null);
  const waves = group.map((c) => c.waveHeight).filter((w): w is number => w != null);
  const wavePeriods = group.map((c) => c.wavePeriod).filter((p): p is number => p != null);
  const swellHeights = group.map((c) => c.swellHeight).filter((h): h is number => h != null);
  const swellPeriods = group.map((c) => c.swellPeriod).filter((p): p is number => p != null);

  // End time = last point + the step to the next point.
  const lastStep =
    group.length >= 2
      ? group[group.length - 1].date.getTime() - group[group.length - 2].date.getTime()
      : ONE_HOUR;

  return {
    start: group[0].date,
    end: new Date(group[group.length - 1].date.getTime() + lastStep),
    windMin: speeds.length > 0 ? Math.min(...speeds) : 0,
    windMax: speeds.length > 0 ? Math.max(...speeds) : 0,
    gustMax: gusts.length > 0 ? Math.max(...gusts) : 0,
    dominantDirection: getDominantDirection(group, "windDirection"),
    waveAvg: avg(waves),
    wavePeriodAvg: avg(wavePeriods),
    waveDominantDirection: getDominantDirection(group, "waveDirection"),
    swellHeightAvg: avg(swellHeights),
    swellPeriodAvg: avg(swellPeriods),
    matchType: getSessionMatchType(group, matchReasons),
    conditions: group,
  };
}

export function groupSessions(
  conditions: WindConditionRaw[],
  matchReasons: Map<WindConditionRaw, MatchReason>,
  minSessionHours: number = 1,
): Session[] {
  if (conditions.length === 0) return [];

  const sorted = [...conditions].sort((a, b) => a.date.getTime() - b.date.getTime());

  const groups: WindConditionRaw[][] = [];
  let current: WindConditionRaw[] = [sorted[0]];
  let currentMatchType = matchReasons.get(sorted[0]);

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].date.getTime() - sorted[i - 1].date.getTime();
    const matchType = matchReasons.get(sorted[i]);

    // Break session if matchType changes OR gap exceeds 3 hours
    if (matchType !== currentMatchType || gap <= 0 || gap > THREE_HOURS) {
      groups.push(current);
      current = [sorted[i]];
      currentMatchType = matchType;
    } else {
      current.push(sorted[i]);
    }
  }
  groups.push(current);

  return groups
    .map((g) => finalizeGroup(g, matchReasons))
    .filter((s) => (s.end.getTime() - s.start.getTime()) / ONE_HOUR >= minSessionHours);
}
