import type { WindConditionRaw } from "../types/wind-conditions.js";

export type Session = {
  start: Date;
  end: Date;
  windMin: number;
  windMax: number;
  gustMax: number;
  dominantDirection: string;
  waveAvg: number;
  conditions: WindConditionRaw[];
};

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const ONE_HOUR = 3_600_000;
const THREE_HOURS = 3 * ONE_HOUR;

export function degreesToCardinal(degrees: number): string {
  return CARDINALS[Math.round(degrees / 45) % 8];
}

function getDominantDirection(conditions: WindConditionRaw[]): string {
  const counts = new Map<string, number>();
  for (const c of conditions) {
    if (c.windDirection == null) continue;
    const cardinal = degreesToCardinal(c.windDirection);
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

function finalizeGroup(group: WindConditionRaw[]): Session {
  const speeds = group.map((c) => c.windSpeed).filter((s): s is number => s != null);
  const gusts = group.map((c) => c.windGusts).filter((g): g is number => g != null);
  const waves = group.map((c) => c.waveHeight).filter((w): w is number => w != null);

  // End time = last point + the step to the next point.
  // Infer step from the last two points in the group, or default to 1h for single-point groups.
  const lastStep =
    group.length >= 2
      ? group[group.length - 1].date.getTime() - group[group.length - 2].date.getTime()
      : ONE_HOUR;

  const waveAvg = waves.length > 0 ? waves.reduce((sum, w) => sum + w, 0) / waves.length : 0;

  return {
    start: group[0].date,
    end: new Date(group[group.length - 1].date.getTime() + lastStep),
    windMin: Math.min(...speeds),
    windMax: Math.max(...speeds),
    gustMax: Math.max(...gusts),
    dominantDirection: getDominantDirection(group),
    waveAvg,
    conditions: group,
  };
}

export function groupSessions(
  conditions: WindConditionRaw[],
  minSessionHours: number = 1,
): Session[] {
  if (conditions.length === 0) return [];

  const sorted = [...conditions].sort((a, b) => a.date.getTime() - b.date.getTime());

  const groups: WindConditionRaw[][] = [];
  let current: WindConditionRaw[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].date.getTime() - sorted[i - 1].date.getTime();
    if (gap > 0 && gap <= THREE_HOURS) {
      current.push(sorted[i]);
    } else {
      groups.push(current);
      current = [sorted[i]];
    }
  }
  groups.push(current);

  return groups
    .map(finalizeGroup)
    .filter((s) => (s.end.getTime() - s.start.getTime()) / ONE_HOUR >= minSessionHours);
}
