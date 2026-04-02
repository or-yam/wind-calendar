import { MODELS } from "../../shared/models";

// Derive Open-Meteo model slugs from shared model definitions
export const OPEN_METEO_MODELS = Object.fromEntries(
  (Object.entries(MODELS) as Array<[string, any]>)
    .filter(([, m]) => m.provider === "openmeteo")
    .map(([, m]) => [m.openMeteoSlug, { id: m.openMeteoSlug, name: m.name }]),
) as Record<string, { id: string; name: string }>;

export type OpenMeteoModelId = keyof typeof OPEN_METEO_MODELS;

export function isValidOpenMeteoModelId(id: string): id is OpenMeteoModelId {
  return id in OPEN_METEO_MODELS;
}
