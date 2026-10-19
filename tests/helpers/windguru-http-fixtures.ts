import type { APIRoot } from "../../server/types/api-response";
import type { SpotInfo } from "../../server/types/forecast";
import { LOCATIONS } from "../../shared/locations";
import { buildMockAPIRoot, mockSpotInfo } from "./windguru-mocks";
import { FORECAST_DAY, type ProviderHour } from "./provider-hours";

type Location = (typeof LOCATIONS)[keyof typeof LOCATIONS];
const MODEL_IDS = [3, 45, 59, 117, 84];

export function windguruSpot(location: Location): SpotInfo {
  const spot = structuredClone(mockSpotInfo.spots["771"]);
  return {
    ...structuredClone(mockSpotInfo),
    spots: {
      [location.spotId]: {
        ...spot,
        id_spot: location.spotId,
        spotname: location.label,
        ...location.coordinates,
        models: MODEL_IDS,
      },
    },
    tabs: [
      {
        ...structuredClone(mockSpotInfo.tabs[0]),
        id_spot: location.spotId,
        ...location.coordinates,
        id_model_arr: MODEL_IDS.map((id_model) => ({
          id_model,
          rundef: `run-${id_model}`,
          period: 1,
          initstr: FORECAST_DAY,
          cachefix: "fixture",
        })),
      },
    ],
  };
}

export function windguruForecast(location: Location, modelId: number, hours: ProviderHour[]) {
  const base = buildMockAPIRoot(hours.map((h) => h.windSpeed));
  const initstamp = Date.parse(`${FORECAST_DAY}T00:00:00Z`) / 1000;
  const initdate = `${FORECAST_DAY} 00:00:00`;
  return {
    ...base,
    id_spot: Number(location.spotId),
    ...location.coordinates,
    id_model: modelId,
    model: `fixture-${modelId}`,
    wgmodel: { ...base.wgmodel, id_model: modelId, initstamp, initdate },
    fcst: {
      ...base.fcst,
      id_model: modelId,
      initstamp,
      initdate,
      hours: hours.map((h) => h.hour),
      GUST: hours.map((h) => h.windGusts),
      WINDDIR: hours.map((h) => h.windDirection),
      ...(modelId === 84 && { HTSGW: hours.map((h) => h.waveHeight) }),
    },
  } satisfies APIRoot;
}
