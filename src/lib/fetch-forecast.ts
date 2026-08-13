import type { CalendarConfig } from "@shared/types";
import type { ForecastResponse } from "@shared/forecast-types";
import { buildConfigParams } from "./subscribe-urls";
import { captureApiError, captureEvent } from "./analytics";

export async function fetchForecast(
  config: CalendarConfig,
  signal?: AbortSignal,
): Promise<ForecastResponse> {
  const params = buildConfigParams(config);
  let response: Response;
  try {
    response = await fetch(`/api/forecast?${params}`, { signal });
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      captureApiError("forecast", 0, "network");
    }
    throw error;
  }

  if (!response.ok) {
    captureApiError("forecast", response.status, "http");
    const contentType = response.headers.get("content-type");
    const body = await response.text();

    if (contentType?.includes("application/json")) {
      try {
        const error = JSON.parse(body);
        throw new Error(error.message || error.error || `HTTP ${response.status}`);
      } catch {
        throw new Error(`HTTP ${response.status}`);
      }
    }

    throw new Error(body || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    captureApiError("forecast", response.status, "invalid response");
    throw new Error("API returned non-JSON response");
  }

  try {
    const forecast = (await response.json()) as ForecastResponse;
    captureEvent("forecast loaded", {
      session_count: forecast.sessions.length,
      data_source: forecast.meta.dataSource,
    });
    return forecast;
  } catch (error) {
    captureApiError("forecast", response.status, "invalid response");
    throw error;
  }
}
