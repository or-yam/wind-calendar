import type { CalendarConfig } from "../shared/types.js";
import { LOCATIONS } from "../shared/locations.js";
import { normalizeQueryParams } from "./config-query.js";
import {
  decodeConfigValue,
  LocationsSchema,
  MinSessionHoursSchema,
  ModelSchema,
  WindNumbersSchema,
  WaveSourceSchema,
  WaveNumbersSchema,
} from "./config-schema.js";
import { WindRangeSchema, WaveHeightRangeSchema, WavePeriodSchema } from "./config-ranges.js";

export function parseQueryParams(searchParams: URLSearchParams): CalendarConfig {
  const query = normalizeQueryParams(searchParams);
  // Stages preserve first-error precedence, including number parsing before range checks.
  const locations = decodeConfigValue(LocationsSchema, query.locations);
  const minSessionHours = decodeConfigValue(MinSessionHoursSchema, query.minSessionHours);
  const model = decodeConfigValue(ModelSchema, query.model);
  const wind = decodeConfigValue(WindNumbersSchema, query);
  decodeConfigValue(WindRangeSchema, wind);
  const waveSource = decodeConfigValue(WaveSourceSchema, query.waveSource);
  const waves = decodeConfigValue(WaveNumbersSchema, query);
  decodeConfigValue(WaveHeightRangeSchema, waves);
  decodeConfigValue(WavePeriodSchema, waves.wavePeriodMin);

  return {
    locations: [...locations],
    minSessionHours,
    model,
    windEnabled: query.windEnabled,
    ...wind,
    waveEnabled: query.waveEnabled,
    waveSource,
    ...waves,
  };
}

export function resolveLocation(name: string): {
  spotId: string;
  tz: string;
  label: string;
  coordinates?: { lat: number; lon: number };
} {
  const loc = LOCATIONS[name as keyof typeof LOCATIONS];
  if (!loc) {
    throw new Error(
      `Unknown location: "${name}". Valid locations: ${Object.keys(LOCATIONS).join(", ")}`,
    );
  }
  return loc;
}
