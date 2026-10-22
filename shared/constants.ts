export const DEFAULTS = {
  locations: ["beit-yanai"],
  minSessionHours: 1,
  model: "om_icon",

  // Wind
  windEnabled: true,
  windMin: 14,
  windMax: 35,

  // Waves
  waveEnabled: false,
  waveSource: "total" as const,
  waveHeightMin: 0.5,
  waveHeightMax: 3.0,
  wavePeriodMin: 0,
} as const;

export const WIND_ICON = "►";
export const WAVE_ICON = "≈";
