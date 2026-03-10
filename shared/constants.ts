export const DEFAULTS = {
  minSessionHours: 2,
  model: 3,

  // Wind
  windEnabled: true,
  windMin: 14,
  windMax: 35,

  // Waves
  waveEnabled: false,
  waveSource: "total" as const,
  waveHeightMin: 0.5,
  waveHeightMax: 5.0,
  wavePeriodMin: 8,
} as const;

export const WIND_ICON = "►";
export const WAVE_ICON = "≈";
