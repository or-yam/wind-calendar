export interface CalendarConfig {
  location: string;
  windMin: number;
  windMax: number;
  minSessionHours: number;
  model: number | string; // Support both Windguru (number) and Open-Meteo (string)
  waveHeightMin: number;
}

export interface LocationConfig {
  spotId: string;
  tz: string;
  label: string;
  models: number[];
  coordinates?: { lat: number; lon: number };
}
