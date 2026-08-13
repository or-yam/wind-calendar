import { queryOptions } from "@tanstack/react-query";
import { captureApiError } from "./analytics";

interface Features {
  freeTextConfigBuilder: boolean;
}

export const featuresQueryOptions = queryOptions({
  queryKey: ["features"] as const,
  queryFn: async ({ signal }): Promise<Features> => {
    let response: Response;
    try {
      response = await fetch("/api/features", { signal });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        captureApiError("features", 0, "network");
      }
      throw error;
    }
    if (!response.ok) {
      captureApiError("features", response.status, "http");
      throw new Error(`Features request failed: ${response.status}`);
    }
    return response.json() as Promise<Features>;
  },
  staleTime: 15_000,
});
