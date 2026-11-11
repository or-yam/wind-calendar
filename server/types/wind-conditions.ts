export type DaylightInterval = { sunrise: Date; sunset: Date };

export interface ProviderWindData {
  windData: WindConditionRaw[];
  sunrise: string;
  sunset: string;
  daylight?: DaylightInterval[];
}

export type WindConditionRaw = {
  date: Date;
  windSpeed: number | null;
  windGusts: number | null;
  windDirection: number | null;
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDirection: number | null;
  swellHeight: number | null;
  swellPeriod: number | null;
  swellDirection: number | null;
};
