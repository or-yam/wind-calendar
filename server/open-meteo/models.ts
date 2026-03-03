export const OPEN_METEO_MODELS = {
  gfs_global: { id: "gfs_global", name: "GFS 13 km" },
  icon_global: { id: "icon_global", name: "ICON 13 km" },
  gem_global: { id: "gem_global", name: "GDPS 15 km" },
  ecmwf_ifs025: { id: "ecmwf_ifs025", name: "IFS-HRES 9 km" },
} as const;

export type OpenMeteoModelId = keyof typeof OPEN_METEO_MODELS;

export function isValidOpenMeteoModelId(id: string): id is OpenMeteoModelId {
  return id in OPEN_METEO_MODELS;
}
