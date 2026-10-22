import { queryOptions } from "@tanstack/react-query";

interface Features {
  freeTextConfigBuilder: boolean;
  wavesForecast: boolean;
  windguruForecastModels: boolean;
}

export const featuresQueryOptions = queryOptions({
  queryKey: ["features"] as const,
  queryFn: async ({ signal }): Promise<Features> => {
    const response = await fetch("/api/features", { signal });
    if (!response.ok) throw new Error(`Features request failed: ${response.status}`);
    return response.json() as Promise<Features>;
  },
  staleTime: 15_000,
});
