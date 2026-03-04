import type { CalendarConfig, WaveSource } from "../shared/types.js";
import { DEFAULTS } from "../shared/constants.js";
import { LOCATIONS } from "../shared/locations.js";
import { MODELS, isValidModelId } from "../shared/models.js";

function parseFloatParam(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const num = parseFloat(raw);
  if (isNaN(num)) throw new Error(`Invalid ${key}: "${raw}" is not a number`);
  return num;
}

function parseBoolParam(params: URLSearchParams, key: string, fallback: boolean): boolean {
  const raw = params.get(key);
  if (raw === null) return fallback;
  return raw === "true";
}

export function parseQueryParams(searchParams: URLSearchParams): CalendarConfig {
  const location = searchParams.get("location") ?? "beit-yanai";

  if (!(location in LOCATIONS)) {
    throw new Error(
      `Unknown location: "${location}". Valid locations: ${Object.keys(LOCATIONS).join(", ")}`,
    );
  }

  const minSessionHours = parseFloatParam(
    searchParams,
    "minSessionHours",
    DEFAULTS.minSessionHours,
  );
  if (minSessionHours < 0 || minSessionHours > 24)
    throw new Error("minSessionHours must be between 0 and 24");

  // Model
  let model: number | string = DEFAULTS.model;
  const modelParam = searchParams.get("model");
  if (modelParam !== null) {
    const numericModel = Number(modelParam);
    model = Number.isNaN(numericModel) ? modelParam : numericModel;
    if (!isValidModelId(model)) {
      const validModels = Object.keys(MODELS).join(", ");
      throw new Error(`Invalid model: "${modelParam}". Valid models: ${validModels}`);
    }
  }

  // Wind
  const windEnabled = parseBoolParam(searchParams, "windEnabled", DEFAULTS.windEnabled);
  const windMin = parseFloatParam(searchParams, "windMin", DEFAULTS.windMin);
  const windMax = parseFloatParam(searchParams, "windMax", DEFAULTS.windMax);
  if (windMin < 0) throw new Error("windMin must be >= 0");
  if (windMax > 200) throw new Error("windMax must be <= 200");
  if (windMin >= windMax) throw new Error("windMin must be less than windMax");

  // Waves
  const waveEnabled = parseBoolParam(searchParams, "waveEnabled", DEFAULTS.waveEnabled);
  const waveSourceRaw = searchParams.get("waveSource") ?? DEFAULTS.waveSource;
  if (waveSourceRaw !== "total" && waveSourceRaw !== "swell")
    throw new Error(`Invalid waveSource: "${waveSourceRaw}". Must be "total" or "swell"`);
  const waveSource: WaveSource = waveSourceRaw;
  const waveHeightMin = parseFloatParam(searchParams, "waveHeightMin", DEFAULTS.waveHeightMin);
  const waveHeightMax = parseFloatParam(searchParams, "waveHeightMax", DEFAULTS.waveHeightMax);
  const wavePeriodMin = parseFloatParam(searchParams, "wavePeriodMin", DEFAULTS.wavePeriodMin);
  if (waveHeightMin < 0) throw new Error("waveHeightMin must be >= 0");
  if (waveHeightMax > 20) throw new Error("waveHeightMax must be <= 20");
  if (waveHeightMin >= waveHeightMax)
    throw new Error("waveHeightMin must be less than waveHeightMax");
  if (wavePeriodMin < 0) throw new Error("wavePeriodMin must be >= 0");

  return {
    location,
    minSessionHours,
    model,
    windEnabled,
    windMin,
    windMax,
    waveEnabled,
    waveSource,
    waveHeightMin,
    waveHeightMax,
    wavePeriodMin,
  };
}

export function resolveLocation(name: string): {
  spotId: string;
  tz: string;
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
