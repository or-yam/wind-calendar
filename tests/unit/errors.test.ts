import { describe, expect, it } from "vitest";
import type { Provider } from "../../shared/models";
import {
  ProviderBadJson,
  ProviderBadStatus,
  ProviderDataError,
  ProviderNetworkError,
  ProviderTimeout,
  classifyProviderError,
} from "../../server/errors";

const LOCATION_INFO = "location=beit-yanai, spotId=771";

function classify(
  error: Parameters<typeof classifyProviderError>[0],
  provider: Provider = "windguru",
  dev = false,
) {
  return classifyProviderError(error, provider, LOCATION_INFO, dev);
}

const badStatus = (status: number, statusText = "Error") =>
  new ProviderBadStatus({
    message: `API request failed: ${status}`,
    url: "https://x",
    status,
    statusText,
    body: "{}",
  });

describe("classifyProviderError", () => {
  it("maps timeouts and network errors to 504 unreachable", () => {
    for (const error of [
      new ProviderTimeout({ message: "Request timed out after 10000ms", url: "https://x" }),
      new ProviderNetworkError({ message: "Network error: boom", url: "https://x" }),
    ]) {
      const result = classify(error);
      expect(result.status).toBe(504);
      expect(result.body.code).toBe("WINDGURU_UNREACHABLE");
      expect(result.body.suggestion).toContain("Could not reach Windguru");
    }
  });

  it("maps upstream 429 to a client 429", () => {
    const result = classify(badStatus(429, "Too Many Requests"));
    expect(result.status).toBe(429);
    expect(result.body).toMatchObject({
      error: "Windguru rate limit exceeded",
      code: "WINDGURU_RATE_LIMIT",
      suggestion: "Try again in 5 minutes",
    });
  });

  it("maps upstream 400/403/404 to 502 with provider-specific codes", () => {
    expect(classify(badStatus(400))).toMatchObject({
      status: 502,
      body: { code: "WINDGURU_BAD_REQUEST", suggestion: "Check that the spot ID is valid" },
    });
    expect(classify(badStatus(403))).toMatchObject({
      status: 502,
      body: { code: "WINDGURU_FORBIDDEN" },
    });
    expect(classify(badStatus(404))).toMatchObject({
      status: 502,
      body: { code: "WINDGURU_NOT_FOUND" },
    });
    expect(classify(badStatus(400), "openmeteo")).toMatchObject({
      status: 502,
      body: {
        code: "OPENMETEO_BAD_REQUEST",
        suggestion: "Check that coordinates and model are valid",
      },
    });
  });

  it("maps upstream >= 500 to 502 down", () => {
    const result = classify(badStatus(503, "Service Unavailable"));
    expect(result).toMatchObject({
      status: 502,
      body: { code: "WINDGURU_DOWN", suggestion: "Try again later" },
    });
  });

  it("maps a success status to 502 bad response", () => {
    const result = classify(badStatus(200, "OK"));
    expect(result).toMatchObject({
      status: 502,
      body: { code: "WINDGURU_BAD_RESPONSE" },
    });
  });

  it("falls back to FETCH_FAILED for an unhandled 4xx status", () => {
    const result = classify(badStatus(418, "I'm a teapot"));
    expect(result).toMatchObject({ status: 502, body: { code: "FETCH_FAILED" } });
  });

  it("maps invalid JSON to bad response", () => {
    const result = classify(
      new ProviderBadJson({ message: "bad json", url: "https://x", status: 200 }),
    );
    expect(result).toMatchObject({
      status: 502,
      body: { code: "WINDGURU_BAD_RESPONSE" },
    });
  });

  it("maps Open-Meteo data errors to OPENMETEO_BAD_RESPONSE", () => {
    const result = classify(
      new ProviderDataError({ message: "Missing sunrise/sunset data in forecast response" }),
      "openmeteo",
    );
    expect(result).toMatchObject({
      status: 502,
      body: {
        error: "Invalid response from Open-Meteo",
        code: "OPENMETEO_BAD_RESPONSE",
        suggestion: "The API response format may have changed",
      },
    });
  });

  it("maps Windguru data errors to FETCH_FAILED", () => {
    const result = classify(
      new ProviderDataError({ message: "Model 999 not available for spot 771" }),
    );
    expect(result).toMatchObject({
      status: 502,
      body: { error: "Windguru request failed", code: "FETCH_FAILED" },
    });
  });

  it("includes debug only when dev is enabled", () => {
    expect(classify(badStatus(503), "windguru", false).body.debug).toBeUndefined();

    const debug = classify(badStatus(503), "windguru", true).body.debug;
    expect(debug).toMatchObject({
      provider: "windguru",
      locationInfo: LOCATION_INFO,
      url: "https://x",
      upstreamStatus: 503,
    });
  });
});
