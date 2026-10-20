export const FORECAST_DAY = "2099-06-15";

export interface ProviderHour {
  hour: number; // UTC; Jerusalem is UTC+3 on the fixture date.
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  waveHeight: number;
  wavePeriod: number;
  waveDirection: number;
  swellHeight: number;
  swellPeriod: number;
  swellDirection: number;
}

export function providerHour(hour: number, windSpeed: number): ProviderHour {
  return {
    hour,
    windSpeed,
    windGusts: windSpeed + 7,
    windDirection: 270,
    waveHeight: 0.3,
    wavePeriod: 4,
    waveDirection: 225,
    swellHeight: 0.2,
    swellPeriod: 8,
    swellDirection: 180,
  };
}

export const PROVIDER_HOURS: ProviderHour[] = [
  providerHour(2, 30), // Before sunrise; must not qualify despite strong wind.
  { ...providerHour(3, 14), waveHeight: 1.2, wavePeriod: 6, swellHeight: 0.4, swellPeriod: 10 },
  {
    ...providerHour(4, 18),
    windDirection: 315,
    waveHeight: 1.6,
    wavePeriod: 8,
    swellHeight: 0.8,
    swellPeriod: 12,
  },
  { ...providerHour(5, 20), waveHeight: 2, wavePeriod: 10, swellHeight: 1.2, swellPeriod: 14 },
  { ...providerHour(6, 8), waveHeight: 2.4, wavePeriod: 12, swellHeight: 1.6, swellPeriod: 16 },
  providerHour(10, 16),
  providerHour(11, 17),
  providerHour(15, 19), // One hour: excluded by the default minimum duration.
  providerHour(16, 30), // Exactly sunset: excluded.
];

export type ProviderFixtures = Record<string, ProviderHour[]>;

export const DEFAULT_PROVIDER_FIXTURES: ProviderFixtures = { "beit-yanai": PROVIDER_HOURS };

export function utcTime(hour: number): string {
  return `${FORECAST_DAY}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

export function localTime(hour: number): string {
  return `${FORECAST_DAY}T${String(hour + 3).padStart(2, "0")}:00`;
}
