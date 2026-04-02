/**
 * Open-Meteo-specific configuration and query parsing.
 * Isolated from Windguru flow.
 */

import { LOCATIONS } from "../../shared/locations";
import { OPEN_METEO_MODELS, isValidOpenMeteoModelId, type OpenMeteoModelId } from "./models";

export interface OpenMeteoCalendarConfig {
  location: string;
  windMin: number;
  windMax: number;
  minSessionHours: number;
  model: OpenMeteoModelId;
  waveHeightMin: number;
}

export interface OpenMeteoLocation {
  label: string;
  tz: string;
  coordinates: { lat: number; lon: number };
}

/**
 * Parse query params for Open-Meteo endpoint.
 * Similar to parseQueryParams in server/config.ts but expects Open-Meteo model IDs.
 */
export function parseOpenMeteoQueryParams(params: URLSearchParams): OpenMeteoCalendarConfig {
  const location = params.get("location");
  if (!location) {
    throw new Error("Missing required parameter: location");
  }

  const modelParam = params.get("model");
  if (!modelParam) {
    throw new Error("Missing required parameter: model");
  }

  if (!isValidOpenMeteoModelId(modelParam)) {
    throw new Error(
      `Invalid Open-Meteo model: ${modelParam}. Valid models: ${Object.keys(OPEN_METEO_MODELS).join(", ")}`,
    );
  }

  const windMin = Number(params.get("wind_min") ?? 14);
  const windMax = Number(params.get("wind_max") ?? 30);
  const minSessionHours = Number(params.get("min_session_hours") ?? 2);
  const waveHeightMin = Number(params.get("wave_height_min") ?? 0);

  if (isNaN(windMin) || windMin < 0) {
    throw new Error("wind_min must be a non-negative number");
  }
  if (isNaN(windMax) || windMax <= windMin) {
    throw new Error("wind_max must be greater than wind_min");
  }
  if (isNaN(minSessionHours) || minSessionHours < 0) {
    throw new Error("min_session_hours must be a non-negative number");
  }
  if (isNaN(waveHeightMin) || waveHeightMin < 0) {
    throw new Error("wave_height_min must be a non-negative number");
  }

  return {
    location,
    windMin,
    windMax,
    minSessionHours,
    model: modelParam,
    waveHeightMin,
  };
}

/**
 * Resolve location ID to OpenMeteoLocation with coordinates.
 * Throws if location not found or missing coordinates.
 */
export function resolveOpenMeteoLocation(locationId: string): OpenMeteoLocation {
  const location = LOCATIONS[locationId as keyof typeof LOCATIONS];
  if (!location) {
    const validLocations = Object.keys(LOCATIONS).join(", ");
    throw new Error(`Unknown location: ${locationId}. Valid locations: ${validLocations}`);
  }

  if (!location.coordinates) {
    throw new Error(
      `Location ${locationId} does not have coordinates configured (required for Open-Meteo)`,
    );
  }

  return {
    label: location.label,
    tz: location.tz,
    coordinates: location.coordinates,
  };
}
