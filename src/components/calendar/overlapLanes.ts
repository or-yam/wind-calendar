import type { ForecastSession } from "@shared/forecast-types";

export function sessionKey(session: ForecastSession) {
  return `${session.location.id}-${session.start}-${session.end}-${session.matchType}`;
}

export function laneBox(lane: number, lanes: number) {
  return {
    insetInlineStart: `calc(${(lane * 100) / lanes}% + 2px)`,
    width: `calc(${100 / lanes}% - 4px)`,
  };
}

export function overlapLanes(sessions: ForecastSession[]) {
  const sorted = [...sessions].sort(
    (a, b) =>
      Date.parse(a.start) - Date.parse(b.start) || sessionKey(a).localeCompare(sessionKey(b)),
  );
  const result: { session: ForecastSession; lane: number; lanes: number }[] = [];
  let group: typeof result = [];
  let ends: number[] = [];
  for (const session of sorted) {
    const start = Date.parse(session.start);
    if (ends.every((end) => end <= start)) {
      group.forEach((item) => {
        item.lanes = ends.length;
      });
      group = [];
      ends = [];
    }
    const available = ends.findIndex((end) => end <= start);
    const lane = available < 0 ? ends.length : available;
    ends[lane] = Date.parse(session.end);
    const item = { session, lane, lanes: 1 };
    group.push(item);
    result.push(item);
  }
  group.forEach((item) => {
    item.lanes = ends.length;
  });
  return result;
}
