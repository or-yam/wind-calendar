import type { Effect } from "effect";
import type { APIRoot } from "../types/api-response";
import type { SpotInfo } from "../types/forecast";
import type { ProviderError } from "../errors";
import { requestJson } from "../utils/http";

const BASE_URL = "https://www.windguru.cz/int/iapi.php";
const REQUEST_TIMEOUT_MS = 10_000;

const HEADERS = {
  Referer: "https://www.windguru.cz/",
};

export function makeRequest<T>(url: string): Effect.Effect<T, ProviderError> {
  return requestJson<T>(url, { headers: HEADERS, timeoutMs: REQUEST_TIMEOUT_MS });
}

export function fetchSpotInfo(spotId: string): Effect.Effect<SpotInfo, ProviderError> {
  const params = new URLSearchParams({
    q: "forecast_spot",
    id_spot: spotId,
  });

  return makeRequest<SpotInfo>(`${BASE_URL}?${params}`);
}

export function fetchModelForecast(
  spotId: string,
  modelId: number,
  runDef: string,
): Effect.Effect<APIRoot, ProviderError> {
  const params = new URLSearchParams({
    q: "forecast",
    id_model: modelId.toString(),
    id_spot: spotId,
    rundef: runDef,
    WGCACHEABLE: "21600",
  });

  return makeRequest<APIRoot>(`${BASE_URL}?${params}`);
}
