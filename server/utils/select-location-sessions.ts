import type { CalendarConfig } from "../../shared/types.js";
import type { WindConditionRaw } from "../types/wind-conditions.js";
import type { MatchReason } from "./filterEvents.js";
import { groupSessions, type Session } from "./groupSessions.js";

export type LocationSession = Session & { location: { id: string; label: string; tz: string } };

type Candidate = {
  condition: WindConditionRaw;
  matchType: MatchReason;
  location: LocationSession["location"];
};

function waveHeight(candidate: Candidate, config: CalendarConfig): number {
  if (candidate.matchType === "wind") return -1;
  const key = config.waveSource === "swell" ? "swellHeight" : "waveHeight";
  return candidate.condition[key] ?? -1;
}

function windSpeed(candidate: Candidate): number {
  if (candidate.matchType === "wave") return -1;
  return candidate.condition.windSpeed ?? -1;
}

function compareCandidates(
  a: Candidate,
  b: Candidate,
  config: CalendarConfig,
  locationOrder: Map<string, number>,
): number {
  if (config.windEnabled) {
    const difference = windSpeed(b) - windSpeed(a);
    if (difference !== 0) return difference;
  }
  if (config.waveEnabled) {
    const difference = waveHeight(b, config) - waveHeight(a, config);
    if (difference !== 0) return difference;
  }
  return (
    (locationOrder.get(a.location.id) ?? Number.MAX_SAFE_INTEGER) -
    (locationOrder.get(b.location.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

function selectIntervalWinners(sessions: LocationSession[], config: CalendarConfig): Candidate[] {
  const locationOrder = new Map(config.locations.map((location, index) => [location, index]));
  const intervals = new Map<number, Candidate[]>();

  for (const session of sessions) {
    for (const condition of session.conditions) {
      const timestamp = condition.date.getTime();
      const candidates = intervals.get(timestamp) ?? [];
      candidates.push({ condition, matchType: session.matchType, location: session.location });
      intervals.set(timestamp, candidates);
    }
  }

  return [...intervals.entries()]
    .sort(([a], [b]) => a - b)
    .map(
      ([, candidates]) =>
        candidates.sort((a, b) => compareCandidates(a, b, config, locationOrder))[0],
    );
}

export function selectBestLocationSessions(
  sessions: LocationSession[],
  config: CalendarConfig,
): LocationSession[] {
  const winners = selectIntervalWinners(sessions, config);
  const runs: Candidate[][] = [];

  for (const winner of winners) {
    const current = runs.at(-1);
    const previous = current?.at(-1);
    if (
      !current ||
      previous?.location.id !== winner.location.id ||
      previous.matchType !== winner.matchType
    ) {
      runs.push([winner]);
    } else {
      current.push(winner);
    }
  }

  return runs.flatMap((run) => {
    const reasons = new Map(run.map(({ condition, matchType }) => [condition, matchType]));
    return groupSessions(
      run.map(({ condition }) => condition),
      reasons,
      config.minSessionHours,
    ).map((session) => ({ ...session, location: run[0].location }));
  });
}
