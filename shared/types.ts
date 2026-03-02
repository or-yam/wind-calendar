export interface CalendarConfig {
  location: string;
  windMin: number;
  windMax: number;
  minSessionHours: number;
  model: number;
  waveHeightMin: number;
}

export interface LocationConfig {
  spotId: string;
  tz: string;
  label: string;
}
