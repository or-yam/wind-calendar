import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "../../shared/constants";

const analytics = vi.hoisted(() => ({ captureEvent: vi.fn(), captureApiError: vi.fn() }));
vi.mock("../../src/lib/analytics", () => analytics);

import { fetchForecast } from "../../src/lib/fetch-forecast";

describe("forecast analytics", () => {
  const config = { ...DEFAULTS, locations: [...DEFAULTS.locations] };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks each successful fetch once with safe aggregates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            meta: { dataSource: "open-meteo", locations: ["secret-location"] },
            sessions: [{ location: { id: "secret-location" } }, {}],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      ),
    );
    await fetchForecast(config);
    expect(analytics.captureEvent).toHaveBeenCalledOnce();
    expect(analytics.captureEvent).toHaveBeenCalledWith("forecast loaded", {
      session_count: 2,
      data_source: "open-meteo",
    });
  });

  it("tracks grouped HTTP failures without response content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "secret raw provider error" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await expect(fetchForecast(config)).rejects.toThrow();
    expect(analytics.captureApiError).toHaveBeenCalledWith("forecast", 503, "http");
    expect(analytics.captureApiError.mock.calls.flat()).not.toContain("secret raw provider error");
    expect(analytics.captureEvent).not.toHaveBeenCalled();
  });
});
