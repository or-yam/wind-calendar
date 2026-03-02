import type { CalendarConfig } from "../shared/types.js";
import { DEFAULTS } from "../shared/constants.js";
import { LOCATIONS } from "../shared/locations.js";

export function parseQueryParams(searchParams: URLSearchParams): CalendarConfig {
  const location = searchParams.get("location") ?? "beit-yanai";

  if (!(location in LOCATIONS)) {
    throw new Error(
      `Unknown location: "${location}". Valid locations: ${Object.keys(LOCATIONS).join(", ")}`,
    );
  }

  const windMinParam = searchParams.get("windMin");
  const windMaxParam = searchParams.get("windMax");
  const minSessionParam = searchParams.get("minSessionHours");

  let windMin: number = DEFAULTS.windMin;
  let windMax: number = DEFAULTS.windMax;
  let minSessionHours: number = DEFAULTS.minSessionHours;

  if (windMinParam !== null) {
    windMin = parseFloat(windMinParam);
    if (isNaN(windMin)) throw new Error(`Invalid windMin: "${windMinParam}" is not a number`);
    if (windMin < 0) throw new Error("windMin must be >= 0");
  }

  if (windMaxParam !== null) {
    windMax = parseFloat(windMaxParam);
    if (isNaN(windMax)) throw new Error(`Invalid windMax: "${windMaxParam}" is not a number`);
    if (windMax > 200) throw new Error("windMax must be <= 200");
  }

  if (windMin >= windMax) throw new Error("windMin must be less than windMax");

  if (minSessionParam !== null) {
    minSessionHours = parseFloat(minSessionParam);
    if (isNaN(minSessionHours))
      throw new Error(`Invalid minSessionHours: "${minSessionParam}" is not a number`);
    if (minSessionHours < 0 || minSessionHours > 24)
      throw new Error("minSessionHours must be between 0 and 24");
  }

  return {
    location,
    windMin,
    windMax,
    minSessionHours,
    model: DEFAULTS.model,
    waveHeightMin: DEFAULTS.waveHeightMin,
  };
}

export function resolveLocation(name: string): { spotId: string; tz: string } {
  const loc = LOCATIONS[name];
  if (!loc) {
    throw new Error(
      `Unknown location: "${name}". Valid locations: ${Object.keys(LOCATIONS).join(", ")}`,
    );
  }
  return loc;
}
