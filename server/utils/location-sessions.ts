import type { CalendarConfig } from "../../shared/types.js";
import type { Provider } from "../../shared/models.js";
import { resolveLocation } from "../config.js";
import { filterEvents } from "./filterEvents.js";
import { groupSessions } from "./groupSessions.js";
import { resolveForecastData, type ErrorResponse } from "./api-handler.js";
import { selectBestLocationSessions, type LocationSession } from "./select-location-sessions.js";

export { selectBestLocationSessions, type LocationSession } from "./select-location-sessions.js";

export type LocationForecastsResult =
  | {
      success: true;
      sessions: LocationSession[];
      dataSources: Record<string, Provider>;
      fallbackUsed: boolean;
    }
  | { success: false; status: number; body: ErrorResponse };

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
      windDirections: config.windDirections,
      waveEnabled: config.waveEnabled,
      waveSource: config.waveSource,
      waveHeightMin: config.waveHeightMin,
      waveHeightMax: config.waveHeightMax,
      wavePeriodMin: config.wavePeriodMin,
      sunrise: result.fetchResult.sunrise,
      sunset: result.fetchResult.sunset,
      tz: location.tz,
    });
    return groupSessions(conditions, matchReasons, 0).map((session) => ({
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
