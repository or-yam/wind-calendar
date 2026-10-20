import { Effect } from "effect";
import { observeProviderRequest } from "../utils/logging.js";
import { ProviderBadStatus, type ProviderError } from "../errors";
import { providerBadStatus, providerBodyText, providerFetch, providerJson } from "../utils/http";
import type { OpenMeteoForecastResponse, OpenMeteoMarineResponse } from "./types";

const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const MARINE_BASE_URL = "https://marine-api.open-meteo.com/v1/marine";
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Generic GET request for Open-Meteo APIs.
 * Fails with a typed ProviderError on HTTP failure or JSON parse failure.
 */
export function makeRequest<T>(url: string): Effect.Effect<T, ProviderError> {
  return Effect.gen(function* () {
    const response = yield* providerFetch(url, { timeoutMs: REQUEST_TIMEOUT_MS });

    if (!response.ok) {
      const body = yield* providerBodyText(response);
      return yield* providerBadStatus(response, body, url);
    }

    const json = yield* providerJson<{ error?: boolean; reason?: string }>(response, url);

    // Open-Meteo returns { error: true, reason: "..." } on validation errors
    if (json && typeof json === "object" && json.error === true) {
      return yield* new ProviderBadStatus({
        message: `Open-Meteo error: ${json.reason || "Unknown error"}`,
        url,
        status: response.status,
        statusText: response.statusText,
        body: JSON.stringify(json),
      });
    }

    return json as T;
  }).pipe((program) => observeProviderRequest(program, url));
}

/**
 * Fetch wind forecast + sunrise/sunset from Open-Meteo Forecast API.
 */
export function fetchForecast(
  lat: number,
  lon: number,
  model: string,
  tz: string,
): Effect.Effect<OpenMeteoForecastResponse, ProviderError> {
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

  return makeRequest<OpenMeteoForecastResponse>(`${FORECAST_BASE_URL}?${params}`).pipe(
    Effect.annotateLogs({ provider: "openmeteo", providerModel: model, operation: "forecast" }),
  );
}

/**
 * Fetch wave height from Open-Meteo Marine API.
 */
export function fetchMarine(
  lat: number,
  lon: number,
  tz: string,
): Effect.Effect<OpenMeteoMarineResponse, ProviderError> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly:
      "wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction",
    timezone: tz,
    forecast_days: "7",
  });

  return makeRequest<OpenMeteoMarineResponse>(`${MARINE_BASE_URL}?${params}`).pipe(
    Effect.annotateLogs({ provider: "openmeteo", operation: "marine" }),
  );
}
