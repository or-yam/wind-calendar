import { queryOptions } from "@tanstack/react-query";
import { fetchForecast } from "./fetch-forecast";
import type { CalendarConfig } from "@shared/types";

export function forecastQueryOptions(config: CalendarConfig) {
  return queryOptions({
    queryKey: ["forecast", config] as const,
    queryFn: ({ signal }) => fetchForecast(config, signal),
  });
}
