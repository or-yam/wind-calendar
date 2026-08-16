import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildConfigParams,
  buildApiUrl,
  buildFullUrl,
  buildWebcalUrl,
  buildGoogleCalendarUrl,
  buildOutlookUrl,
} from "../../../src/lib/subscribe-urls";
import type { CalendarConfig } from "../../../shared/types";
import { WIND_DIRECTIONS } from "../../../shared/wind-directions";

const baseConfig: CalendarConfig = {
  locations: ["tel-aviv"],
  model: "om_gfs",
  minSessionHours: 2,
  windEnabled: true,
  windMin: 14,
  windMax: 30,
  windDirections: [...WIND_DIRECTIONS],
  waveEnabled: false,
  waveSource: "total",
  waveHeightMin: 0,
  waveHeightMax: 0,
  wavePeriodMin: 0,
};

describe("buildConfigParams", () => {
  it("converts config to URLSearchParams", () => {
    const params = buildConfigParams(baseConfig);

    expect(params.get("locations")).toBe("tel-aviv");
    expect(params.get("model")).toBe("om_gfs");
    expect(params.get("minSessionHours")).toBe("2");
    expect(params.get("windEnabled")).toBe("true");
    expect(params.get("windMin")).toBe("14");
    expect(params.get("windMax")).toBe("30");
  });

  it("excludes wave params when waveEnabled=false", () => {
    const params = buildConfigParams(baseConfig);

    expect(params.get("waveEnabled")).toBe("false");
    expect(params.get("waveSource")).toBeNull();
    expect(params.get("waveHeightMin")).toBeNull();
    expect(params.get("waveHeightMax")).toBeNull();
    expect(params.get("wavePeriodMin")).toBeNull();
  });

  it("serializes enabled wind directions in canonical order", () => {
    const params = buildConfigParams({ ...baseConfig, windDirections: ["NW", "N", "NE"] });
    expect(params.get("windDirections")).toBe("N,NE,NW");
  });

  it("omits wind directions when wind is disabled", () => {
    const params = buildConfigParams({ ...baseConfig, windEnabled: false, waveEnabled: true });
    expect(params.get("windDirections")).toBeNull();
  });

  it("includes wave params when waveEnabled=true", () => {
    const config: CalendarConfig = {
      ...baseConfig,
      waveEnabled: true,
      waveSource: "swell",
      waveHeightMin: 0.5,
      waveHeightMax: 2.0,
      wavePeriodMin: 8,
    };

    const params = buildConfigParams(config);

    expect(params.get("waveEnabled")).toBe("true");
    expect(params.get("waveSource")).toBe("swell");
    expect(params.get("waveHeightMin")).toBe("0.5");
    expect(params.get("waveHeightMax")).toBe("2");
    expect(params.get("wavePeriodMin")).toBe("8");
  });

  it("handles model as number (Windguru)", () => {
    const config: CalendarConfig = {
      ...baseConfig,
      model: 3,
    };

    const params = buildConfigParams(config);
    expect(params.get("model")).toBe("3");
  });

  it("joins multiple locations", () => {
    const config: CalendarConfig = {
      ...baseConfig,
      locations: ["tel-aviv", "herzliya", "beit-yanai"],
    };

    const params = buildConfigParams(config);
    expect(params.get("locations")).toBe("tel-aviv,herzliya,beit-yanai");
  });
});

describe("buildApiUrl", () => {
  it("returns /api/calendar with params", () => {
    const url = buildApiUrl(baseConfig);

    expect(url).toMatch(/^\/api\/calendar\?/);
    expect(url).toContain("locations=tel-aviv");
    expect(url).toContain("model=om_gfs");
  });

  it("encodes special characters", () => {
    const config: CalendarConfig = {
      ...baseConfig,
      locations: ["test & location"],
    };

    const url = buildApiUrl(config);
    expect(url).toMatch(/locations=/);
  });
});

describe("buildFullUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:5173" },
    });
  });

  it("returns full URL with default baseUrl", () => {
    const url = buildFullUrl(baseConfig);

    expect(url).toMatch(/^http:\/\/localhost:5173\/api\/calendar\?/);
    expect(url).toContain("locations=tel-aviv");
  });

  it("uses custom baseUrl when provided", () => {
    const url = buildFullUrl(baseConfig, "https://example.com");

    expect(url).toMatch(/^https:\/\/example\.com\/api\/calendar\?/);
  });
});

describe("buildWebcalUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:5173" },
    });
  });

  it("replaces https: with webcal:", () => {
    const url = buildWebcalUrl(baseConfig);

    expect(url).toMatch(/^webcal:\/\//);
    expect(url).not.toMatch(/^https:\/\//);
    expect(url).not.toMatch(/^http:\/\//);
  });

  it("preserves query params", () => {
    const url = buildWebcalUrl(baseConfig);
    expect(url).toContain("locations=tel-aviv");
  });
});

describe("buildGoogleCalendarUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:5173" },
    });
  });

  it("returns Google Calendar URL with encoded webcal URL", () => {
    const url = buildGoogleCalendarUrl(baseConfig);

    expect(url).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/r\?cid=/);
    expect(decodeURIComponent(url)).toContain("webcal://");
  });
});

describe("buildOutlookUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:5173" },
    });
  });

  it("returns Outlook Web URL with encoded full URL", () => {
    const url = buildOutlookUrl(baseConfig);

    expect(url).toMatch(/^https:\/\/outlook\.live\.com\/calendar\/0\/addfromweb\?url=/);
    expect(decodeURIComponent(url)).toContain("http://localhost:5173");
  });
});
