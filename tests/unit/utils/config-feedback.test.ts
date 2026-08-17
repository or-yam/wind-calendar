import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "../../../shared/constants";
import { sendConfigFeedback } from "../../../src/lib/config-feedback";

const config = { ...DEFAULTS, locations: [...DEFAULTS.locations] };

describe("sendConfigFeedback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only token and confirmed config with keepalive", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendConfigFeedback("opaque-token", config)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith("/api/config-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "opaque-token", confirmedConfig: config }),
      keepalive: true,
    });
  });

  it("retries transient failures once but not validation failures", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendConfigFeedback("opaque-token", config)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset().mockResolvedValue({ ok: false, status: 400 });
    await expect(sendConfigFeedback("opaque-token", config)).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
