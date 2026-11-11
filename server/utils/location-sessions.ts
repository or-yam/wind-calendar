import { Effect } from "effect";
import type { CalendarConfig } from "../../shared/types.js";
import type { Provider } from "../../shared/models.js";
import type { ForecastError } from "../errors.js";
import { resolveLocation } from "../config.js";
import { filterEvents } from "./filterEvents.js";
import { groupSessions } from "./groupSessions.js";
import { resolveForecastData } from "./api-handler.js";
import { selectBestLocationSessions, type LocationSession } from "./select-location-sessions.js";

export { selectBestLocationSessions, type LocationSession } from "./select-location-sessions.js";

export interface LocationForecast {
  sessions: LocationSession[];
  dataSources: Record<string, Provider>;
  fallbackUsed: boolean;
}

export function buildLocationSessions(
  config: CalendarConfig,
  dev: boolean,
): Effect.Effect<LocationForecast, ForecastError> {
  return Effect.gen(function* () {
    const forecasts = yield* Effect.forEach(
      config.locations,
      (id) =>
        Effect.gen(function* () {
          const location = resolveLocation(id);
          const resolved = yield* resolveForecastData(
            { location: id, model: config.model },
            location,
            dev,
          ).pipe(Effect.annotateLogs({ location: id, model: config.model }));
          return { id, location, resolved };
        }),
      { concurrency: "unbounded" },
    );

    const dataSources: Record<string, Provider> = {};
    let fallbackUsed = false;
    const sessions = forecasts.flatMap(({ id, location, resolved }) => {
      dataSources[id] = resolved.dataSource;
      fallbackUsed ||= resolved.fallbackUsed;
      const { conditions, matchReasons, daylightByCondition } = filterEvents(
        resolved.fetchResult.windData,
        {
          windEnabled: config.windEnabled,
          windMin: config.windMin,
          windMax: config.windMax,
          waveEnabled: config.waveEnabled,
          waveSource: config.waveSource,
          waveHeightMin: config.waveHeightMin,
          waveHeightMax: config.waveHeightMax,
          wavePeriodMin: config.wavePeriodMin,
          sunrise: resolved.fetchResult.sunrise,
          sunset: resolved.fetchResult.sunset,
          daylight: resolved.fetchResult.daylight,
          tz: location.tz,
        },
      );
      return groupSessions(conditions, matchReasons, 0, daylightByCondition).map((session) => ({
        ...session,
        location: { id, label: location.label, tz: location.tz },
      }));
    });

    return {
      sessions: selectBestLocationSessions(sessions, config),
      dataSources,
      fallbackUsed,
    };
  });
}
