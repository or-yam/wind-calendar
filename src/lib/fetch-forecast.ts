import type { CalendarConfig } from "@shared/types";
import type { ForecastResponse } from "@shared/forecast-types";
import { buildConfigParams } from "./subscribe-urls";

export async function fetchForecast(
  config: CalendarConfig,
  signal?: AbortSignal,
): Promise<ForecastResponse> {
  const params = buildConfigParams(config);
  const response = await fetch(`/api/forecast?${params}`, { signal });

  if (!response.ok) {
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
    throw new Error("API returned non-JSON response");
  }

  return response.json();
}
