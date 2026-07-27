import type { CalendarConfig } from "../../shared/types";
import type { Provider } from "../../shared/models";
import { resolveLocation } from "../config";
import { filterEvents } from "./filterEvents";
import { groupSessions, type Session } from "./groupSessions";
import { resolveForecastData, type ErrorResponse } from "./api-handler";

export type LocationSession = Session & { location: { id: string; label: string; tz: string } };

export type LocationForecastsResult =
  | {
      success: true;
      sessions: LocationSession[];
      dataSources: Record<string, Provider>;
      fallbackUsed: boolean;
    }
  | { success: false; status: number; body: ErrorResponse };

function peakWave(session: Session, config: CalendarConfig): number {
  const key = config.waveSource === "swell" ? "swellHeight" : "waveHeight";
  return Math.max(...session.conditions.map((condition) => condition[key] ?? 0));
}

function overlaps(a: Session, b: Session): boolean {
  return a.start < b.end && b.start < a.end;
}

export function selectBestLocationSessions(
  sessions: LocationSession[],
  config: CalendarConfig,
): LocationSession[] {
  const locationOrder = new Map(config.locations.map((location, index) => [location, index]));
  const ranked = [...sessions].sort((a, b) => {
    if (config.windEnabled && b.windMax !== a.windMax) return b.windMax - a.windMax;
    if (config.waveEnabled) {
      const waveDifference = peakWave(b, config) - peakWave(a, config);
      if (waveDifference !== 0) return waveDifference;
    }
    return (
      (locationOrder.get(a.location.id) ?? Number.MAX_SAFE_INTEGER) -
      (locationOrder.get(b.location.id) ?? Number.MAX_SAFE_INTEGER)
    );
  });

  const selected: LocationSession[] = [];
  for (const session of ranked) {
    if (!selected.some((winner) => overlaps(session, winner))) selected.push(session);
  }
  return selected.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export async function buildLocationSessions(
  config: CalendarConfig,
  dev: boolean,
): Promise<LocationForecastsResult> {
  const forecasts = await Promise.all(
    config.locations.map(async (id) => {
      const location = resolveLocation(id);
      const result = await resolveForecastData(
        { location: id, model: config.model },
        location,
        dev,
      );
      return { id, location, result };
    }),
  );
  const failure = forecasts.find(({ result }) => result.success === false);
  if (failure?.result.success === false) return failure.result;

  const dataSources: Record<string, Provider> = {};
  let fallbackUsed = false;
  const sessions = forecasts.flatMap(({ id, location, result }) => {
    if (result.success === false) return [];
    dataSources[id] = result.dataSource;
    fallbackUsed ||= result.fallbackUsed;
    const { conditions, matchReasons } = filterEvents(result.fetchResult.windData, {
      windEnabled: config.windEnabled,
      windMin: config.windMin,
      windMax: config.windMax,
      waveEnabled: config.waveEnabled,
      waveSource: config.waveSource,
      waveHeightMin: config.waveHeightMin,
      waveHeightMax: config.waveHeightMax,
      wavePeriodMin: config.wavePeriodMin,
      sunrise: result.fetchResult.sunrise,
      sunset: result.fetchResult.sunset,
      tz: location.tz,
    });
    return groupSessions(conditions, matchReasons, config.minSessionHours).map((session) => ({
      ...session,
      location: { id, label: location.label, tz: location.tz },
    }));
  });

  return {
    success: true,
    sessions: selectBestLocationSessions(sessions, config),
    dataSources,
    fallbackUsed,
  };
}
