import { describe, expect, it, vi } from "vitest";
import { fetchForecast } from "../../../src/lib/fetch-forecast";
import type { CalendarConfig } from "../../../shared/types";

const config: CalendarConfig = {
  locations: ["tel-aviv"],
  model: "om_gfs",
  minSessionHours: 2,
  windEnabled: true,
  windMin: 14,
  windMax: 30,
  waveEnabled: false,
  waveSource: "total",
  waveHeightMin: 0,
  waveHeightMax: 0,
  wavePeriodMin: 0,
};

describe("fetchForecast locale isolation", () => {
  it("does not leak the page locale into the forecast URL", async () => {
    window.history.replaceState(null, "", "/?lang=he");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ sessions: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchForecast(config);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("/api/forecast?");
    expect(fetchMock.mock.calls[0][0]).not.toContain("lang=");
  });
});
