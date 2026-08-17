import { WIND_DIRECTIONS } from "./wind-directions";

export const DEFAULTS = {
  locations: ["beit-yanai"],
  minSessionHours: 2,
  model: "om_gfs",

  // Wind
  windEnabled: true,
  windMin: 14,
  windMax: 35,
  windDirections: [...WIND_DIRECTIONS],

  // Waves
  waveEnabled: false,
  waveSource: "total" as const,
  waveHeightMin: 0.5,
  waveHeightMax: 3.0,
  wavePeriodMin: 0,
} as const;

export const WIND_ICON = "►";
export const WAVE_ICON = "≈";
