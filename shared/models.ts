export const MODELS = {
  // Windguru (legacy numeric IDs)
  3: { id: 3, name: "GFS 13 km", provider: "windguru" as const },
  45: { id: 45, name: "ICON 13 km", provider: "windguru" as const },
  59: { id: 59, name: "GDPS 15 km", provider: "windguru" as const },
  117: { id: 117, name: "IFS-HRES 9 km", provider: "windguru" as const },

  // Open-Meteo (string IDs with namespace)
  om_gfs: {
    id: "om_gfs" as const,
    name: "GFS 13 km",
    provider: "openmeteo" as const,
    openMeteoSlug: "gfs_global",
  },
  om_icon: {
    id: "om_icon" as const,
    name: "ICON 13 km",
    provider: "openmeteo" as const,
    openMeteoSlug: "icon_global",
  },
  om_gdps: {
    id: "om_gdps" as const,
    name: "GDPS 15 km",
    provider: "openmeteo" as const,
    openMeteoSlug: "gem_global",
  },
  om_ifs: {
    id: "om_ifs" as const,
    name: "IFS-HRES 9 km",
    provider: "openmeteo" as const,
    openMeteoSlug: "ecmwf_ifs025",
  },
} as const;

export type ModelId = keyof typeof MODELS;
export type Provider = "windguru" | "openmeteo";

// Discriminated model types
export type WindguruModelId = 3 | 45 | 59 | 117;
export type OpenMeteoModelId = "om_gfs" | "om_icon" | "om_gdps" | "om_ifs";

export type WindguruModel = (typeof MODELS)[WindguruModelId];
export type OpenMeteoModel = (typeof MODELS)[OpenMeteoModelId];

export function isValidModelId(id: number | string): id is ModelId {
  return id in MODELS;
}

export function isWindguruModelId(id: ModelId): id is WindguruModelId {
  return typeof id === "number";
}

export function isOpenMeteoModelId(id: ModelId): id is OpenMeteoModelId {
  return typeof id === "string";
}

export function getProvider(modelId: ModelId): Provider {
  return MODELS[modelId].provider;
}

export function getOpenMeteoSlug(modelId: OpenMeteoModelId): string {
  const model = MODELS[modelId];
  return model.openMeteoSlug;
}

/**
 * Find Windguru model that matches an Open-Meteo model by name.
 * Derived from model metadata - no hardcoded mapping.
 */
export function getWindguruFallback(openMeteoModelId: OpenMeteoModelId): WindguruModelId | null {
  const openMeteoModel = MODELS[openMeteoModelId];

  // Find Windguru model with same name
  const windguruModel = (Object.values(MODELS) as Array<WindguruModel | OpenMeteoModel>).find(
    (m): m is WindguruModel => m.provider === "windguru" && m.name === openMeteoModel.name,
  );

  return windguruModel ? windguruModel.id : null;
}
