export type WaveSource = "total" | "swell";

export interface CalendarConfig {
  locations: string[];
  minSessionHours: number;
  model: number | string; // Support both Windguru (number) and Open-Meteo (string)

  // Wind
  windEnabled: boolean;
  windMin: number;
  windMax: number;

  // Waves
  waveEnabled: boolean;
  waveSource: WaveSource;
  waveHeightMin: number;
  waveHeightMax: number;
  wavePeriodMin: number;
}

export interface InterpretConfigResponse {
  outcome: "configured" | "insufficient" | "unsupported";
  message: string;
  config: CalendarConfig;
}

export interface LocationConfig {
  spotId: string;
  tz: string;
  label: string;
  models: number[];
  coordinates?: { lat: number; lon: number };
}
