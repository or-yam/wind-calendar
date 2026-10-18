import { DEFAULTS } from "../shared/constants.js";

export function normalizeQueryParams(params: URLSearchParams) {
  const repeatedLocations = params.getAll("locations");
  const locations =
    repeatedLocations.length > 0
      ? repeatedLocations.flatMap((value) => value.split(","))
      : [params.get("location") ?? DEFAULTS.locations[0]];

  return {
    locations: [...new Set(locations.map((value) => value.trim()).filter(Boolean))],
    minSessionHours: params.get("minSessionHours") ?? String(DEFAULTS.minSessionHours),
    model: params.get("model") ?? String(DEFAULTS.model),
    windEnabled: params.has("windEnabled")
      ? params.get("windEnabled") === "true"
      : DEFAULTS.windEnabled,
    windMin: params.get("windMin") ?? String(DEFAULTS.windMin),
    windMax: params.get("windMax") ?? String(DEFAULTS.windMax),
    waveEnabled: params.has("waveEnabled")
      ? params.get("waveEnabled") === "true"
      : DEFAULTS.waveEnabled,
    waveSource: params.get("waveSource") ?? DEFAULTS.waveSource,
    waveHeightMin: params.get("waveHeightMin") ?? String(DEFAULTS.waveHeightMin),
    waveHeightMax: params.get("waveHeightMax") ?? String(DEFAULTS.waveHeightMax),
    wavePeriodMin: params.get("wavePeriodMin") ?? String(DEFAULTS.wavePeriodMin),
  };
}
