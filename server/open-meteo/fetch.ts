import { ApiError } from "../windguru/fetch";
import type { OpenMeteoForecastResponse, OpenMeteoMarineResponse } from "./types";

const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const MARINE_BASE_URL = "https://marine-api.open-meteo.com/v1/marine";
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Generic GET request for Open-Meteo APIs.
 * Throws ApiError on HTTP failure or JSON parse failure.
 */
export async function makeRequest<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const isTimeout =
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    if (isTimeout) {
      throw new ApiError(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`, { url });
    }
    throw new ApiError(`Network error: ${error instanceof Error ? error.message : String(error)}`, {
      url,
    });
  }

  if (!response.ok) {
    throw new ApiError(`API request failed: ${response.status} ${response.statusText}`, {
      status: response.status,
      response: await response.text().catch(() => "<response body unavailable>"),
      url,
    });
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(`Invalid JSON response (status ${response.status})`, {
      status: response.status,
      url,
    });
  }

  // Open-Meteo returns { error: true, reason: "..." } on validation errors
  if (json && typeof json === "object" && json.error === true) {
    throw new ApiError(`Open-Meteo error: ${json.reason || "Unknown error"}`, {
      status: response.status,
      response: JSON.stringify(json),
      url,
    });
  }

  return json as T;
}

/**
 * Fetch wind forecast + sunrise/sunset from Open-Meteo Forecast API.
 */
export async function fetchForecast(
  lat: number,
  lon: number,
  model: string,
  tz: string,
): Promise<OpenMeteoForecastResponse> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    daily: "sunrise,sunset",
    wind_speed_unit: "kn",
    timezone: tz,
    forecast_days: "7",
    models: model,
  });

  return makeRequest<OpenMeteoForecastResponse>(`${FORECAST_BASE_URL}?${params}`);
}

/**
 * Fetch wave height from Open-Meteo Marine API.
 */
export async function fetchMarine(
  lat: number,
  lon: number,
  tz: string,
): Promise<OpenMeteoMarineResponse> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly:
      "wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction",
    timezone: tz,
    forecast_days: "7",
  });

  return makeRequest<OpenMeteoMarineResponse>(`${MARINE_BASE_URL}?${params}`);
}
