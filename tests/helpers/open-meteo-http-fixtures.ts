import type {
  OpenMeteoForecastResponse,
  OpenMeteoMarineResponse,
} from "../../server/open-meteo/types";
import { FORECAST_DAY, localTime, type ProviderHour } from "./provider-hours";

const metadata = {
  generationtime_ms: 1,
  utc_offset_seconds: 10_800,
  timezone: "Asia/Jerusalem",
  timezone_abbreviation: "IDT",
};

// Open-Meteo uses one response offset across DST: https://open-meteo.com/en/docs#api_documentation
export function daylightForecast(
  hours: string[],
  days: { day: string; sunrise: string; sunset: string }[],
  offset = 7200,
) {
  return {
    ...openMeteoForecast(32.38, 34.87, []),
    utc_offset_seconds: offset,
    timezone_abbreviation: offset === 7200 ? "IST" : "IDT",
    hourly: {
      time: hours,
      wind_speed_10m: hours.map(() => 18),
      wind_direction_10m: hours.map(() => 270),
      wind_gusts_10m: hours.map(() => 24),
    },
    daily: {
      time: days.map(({ day }) => day),
      sunrise: days.map(({ day, sunrise }) => `${day}T${sunrise}`),
      sunset: days.map(({ day, sunset }) => `${day}T${sunset}`),
    },
  } satisfies OpenMeteoForecastResponse;
}

export function openMeteoForecast(latitude: number, longitude: number, hours: ProviderHour[]) {
  return {
    ...metadata,
    latitude,
    longitude,
    elevation: 0,
    hourly_units: {
      time: "iso8601",
      wind_speed_10m: "kn",
      wind_gusts_10m: "kn",
      wind_direction_10m: "°",
    },
    hourly: {
      time: hours.map((h) => localTime(h.hour)),
      wind_speed_10m: hours.map((h) => h.windSpeed),
      wind_gusts_10m: hours.map((h) => h.windGusts),
      wind_direction_10m: hours.map((h) => h.windDirection),
    },
    daily_units: { time: "iso8601", sunrise: "iso8601", sunset: "iso8601" },
    daily: {
      time: [FORECAST_DAY],
      sunrise: [`${FORECAST_DAY}T06:00`],
      sunset: [`${FORECAST_DAY}T19:00`],
    },
  } satisfies OpenMeteoForecastResponse;
}

export function openMeteoMarine(latitude: number, longitude: number, hours: ProviderHour[]) {
  // Reverse the marine points: merging by array index instead of timestamp must fail tests.
  const marine = [...hours].reverse();
  return {
    ...metadata,
    latitude,
    longitude,
    hourly_units: {
      time: "iso8601",
      wave_height: "m",
      wave_period: "s",
      wave_direction: "°",
      swell_wave_height: "m",
      swell_wave_period: "s",
      swell_wave_direction: "°",
    },
    hourly: {
      time: marine.map((h) => localTime(h.hour)),
      wave_height: marine.map((h) => h.waveHeight),
      wave_period: marine.map((h) => h.wavePeriod),
      wave_direction: marine.map((h) => h.waveDirection),
      swell_wave_height: marine.map((h) => h.swellHeight),
      swell_wave_period: marine.map((h) => h.swellPeriod),
      swell_wave_direction: marine.map((h) => h.swellDirection),
    },
  } satisfies OpenMeteoMarineResponse;
}
