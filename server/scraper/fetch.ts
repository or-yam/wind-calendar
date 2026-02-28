import type { APIRoot } from "../types/api-response";
import type { SpotInfo } from "../types/forecast";

const BASE_URL = "https://www.windguru.cz/int/iapi.php";
const REQUEST_TIMEOUT_MS = 10_000;

const HEADERS = {
  Referer: "https://www.windguru.cz/",
};

interface ApiErrorOptions {
  status?: number;
  response?: string;
  url?: string;
}

export class ApiError extends Error {
  status?: number;
  response?: string;
  url?: string;

  constructor(message: string, options?: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status;
    this.response = options?.response;
    this.url = options?.url;
  }
}

export async function makeRequest<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: HEADERS,
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

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(`Invalid JSON response (status ${response.status})`, {
      status: response.status,
      url,
    });
  }
}

export async function fetchSpotInfo(spotId: string): Promise<SpotInfo> {
  const params = new URLSearchParams({
    q: "forecast_spot",
    id_spot: spotId,
  });

  return makeRequest<SpotInfo>(`${BASE_URL}?${params}`);
}

export async function fetchModelForecast(spotId: string, modelId: number, runDef: string) {
  const params = new URLSearchParams({
    q: "forecast",
    id_model: modelId.toString(),
    id_spot: spotId,
    rundef: runDef,
    WGCACHEABLE: "21600",
  });

  return makeRequest<APIRoot>(`${BASE_URL}?${params}`);
}
