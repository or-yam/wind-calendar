/** Open-Meteo Forecast API response (wind + sunrise/sunset) */
export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  generationtime_ms: number;
  utc_offset_seconds: number; // Timezone offset in seconds (e.g. 7200 for UTC+2)
  timezone: string;
  timezone_abbreviation: string;
  hourly: {
    time: string[]; // ISO 8601: ["2026-03-03T00:00", ...]
    wind_speed_10m: (number | null)[];
    wind_direction_10m: (number | null)[];
    wind_gusts_10m: (number | null)[];
  };
  hourly_units: {
    time: string;
    wind_speed_10m: string; // "kn"
    wind_direction_10m: string; // "°"
    wind_gusts_10m: string; // "kn"
  };
  daily?: {
    time: string[]; // ["2026-03-03"]
    sunrise: string[]; // ISO 8601: ["2026-03-03T06:15"]
    sunset: string[]; // ISO 8601: ["2026-03-03T18:30"]
  };
  daily_units?: {
    time: string;
    sunrise: string; // "iso8601"
    sunset: string; // "iso8601"
  };
}

/** Open-Meteo Marine API response (wave data) */
export interface OpenMeteoMarineResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  hourly: {
    time: string[]; // ISO 8601: ["2026-03-03T00:00", ...]
    wave_height: (number | null)[];
  };
  hourly_units: {
    time: string;
    wave_height: string; // "m"
  };
}

/** Open-Meteo error response (returned with HTTP 400) */
export interface OpenMeteoErrorResponse {
  error: true;
  reason: string;
}
