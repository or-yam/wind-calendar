import { describe, it, expect } from "vitest";
import handler from "../../../api/calendar";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type {
  OpenMeteoForecastResponse,
  OpenMeteoMarineResponse,
} from "../../../server/open-meteo/types.js";
import type { SpotInfo } from "../../../server/types/forecast";
import type { APIRoot } from "../../../server/types/api-response";

// --- Mock Open-Meteo Data ---

// Use a future date that has predictable daylight hours
// June 15, 2030 at 00:00 UTC
const FUTURE_DATE = "2030-06-15T00:00";
const UTC_OFFSET_SECONDS = 10800; // UTC+3 (Asia/Jerusalem in summer)

const mockOpenMeteoForecast: OpenMeteoForecastResponse = {
  latitude: 32.08,
  longitude: 34.78,
  elevation: 10,
  generationtime_ms: 0.5,
  utc_offset_seconds: UTC_OFFSET_SECONDS,
  timezone: "Asia/Jerusalem",
  timezone_abbreviation: "IDT",
  hourly: {
    time: [
      `${FUTURE_DATE}`,
      "2030-06-15T01:00",
      "2030-06-15T02:00",
      "2030-06-15T03:00",
      "2030-06-15T04:00",
      "2030-06-15T05:00",
      "2030-06-15T06:00",
      "2030-06-15T07:00", // Daylight starts
      "2030-06-15T08:00",
      "2030-06-15T09:00",
      "2030-06-15T10:00",
      "2030-06-15T11:00",
      "2030-06-15T12:00",
      "2030-06-15T13:00",
      "2030-06-15T14:00",
      "2030-06-15T15:00",
      "2030-06-15T16:00",
      "2030-06-15T17:00",
      "2030-06-15T18:00", // Daylight ends
      "2030-06-15T19:00",
      "2030-06-15T20:00",
    ],
    wind_speed_10m: [5, 5, 5, 5, 5, 5, 5, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 5, 5, 5],
    wind_direction_10m: Array(21).fill(270),
    wind_gusts_10m: [8, 8, 8, 8, 8, 8, 8, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 8, 8, 8],
  },
  hourly_units: {
    time: "iso8601",
    wind_speed_10m: "kn",
    wind_direction_10m: "°",
    wind_gusts_10m: "kn",
  },
  daily: {
    time: ["2030-06-15"],
    sunrise: ["2030-06-15T05:30"],
    sunset: ["2030-06-15T19:50"],
  },
  daily_units: {
    time: "iso8601",
    sunrise: "iso8601",
    sunset: "iso8601",
  },
};

const mockOpenMeteoMarine: OpenMeteoMarineResponse = {
  latitude: 32.08,
  longitude: 34.78,
  generationtime_ms: 0.3,
  utc_offset_seconds: UTC_OFFSET_SECONDS,
  timezone: "Asia/Jerusalem",
  timezone_abbreviation: "IDT",
  hourly: {
    time: mockOpenMeteoForecast.hourly.time,
    wave_height: Array(21).fill(1.2),
  },
  hourly_units: {
    time: "iso8601",
    wave_height: "m",
  },
};

// --- Mock Windguru Data (for fallback tests) ---

const FUTURE_INITSTAMP = Math.floor(new Date("2030-06-15T00:00:00Z").getTime() / 1000);

const mockWindguruSpotInfo: SpotInfo = {
  tabs: [
    {
      id_spot: "308",
      lat: 32.08,
      lon: 34.78,
      id_model: 3,
      model_period: 3,
      options: {
        wj: "",
        tj: "",
        waj: "",
        tij: "",
        odh: 0,
        doh: 0,
        fhours: 0,
        limit1: 0,
        limit2: 0,
        limit3: 0,
        tlimit: 0,
        vt: "",
        wrapnew: undefined,
        show_flhgt_opt: 0,
        map_open_fn: "",
        params: [],
        var_map: undefined,
        tide: { style: "", min: 0 },
      },
      id_model_arr: [
        {
          id_model: 3,
          rundef: "run1",
          period: 3,
          initstr: "",
          cachefix: "cachefix1",
        },
      ],
      share: false,
    },
  ],
  spots: {
    "308": {
      id_spot: "308",
      id_user: "1",
      spotname: "Tel Aviv",
      country: "Israel",
      id_country: 1,
      lat: 32.08,
      lon: 34.78,
      alt: 0,
      tz: "Asia/Jerusalem",
      tzid: "Asia/Jerusalem",
      gmt_hour_offset: 3,
      sunrise: "05:30",
      sunset: "19:50",
      sst: 25,
      models: [3],
      tides: "",
      tide: {
        "2N2": [],
        EPS2: [],
        J1: [],
        K1: [],
      } as any,
    },
  },
  tabs_hidden: [],
  message: "",
};

const mockWindguruAPIRoot: APIRoot = {
  id_spot: 308,
  lat: 32.08,
  lon: 34.78,
  alt: 0,
  id_model: 3,
  model: "GFS",
  model_alt: 0,
  levels: 1,
  sunrise: "05:30",
  sunset: "19:50",
  md5chk: "",
  coast: false,
  wgmodel: {
    id_model: 3,
    model: "gfs",
    model_name: "GFS 13km",
    model_longname: "GFS 13km",
    lat: [32],
    lon: [34],
    pro: false,
    priority: 1,
    resolution: 13,
    resolution_real: 13,
    initdate: "2030-06-15 00:00:00",
    initstamp: FUTURE_INITSTAMP,
    period: 1,
    hr_start: 0,
    hr_end: 20,
    hr_step: 1,
    wave: false,
    maps: false,
    dynamic_updates: false,
    rundef: "run1",
    runs: [],
  },
  fcst: {
    initstamp: FUTURE_INITSTAMP,
    hours: Array.from({ length: 21 }, (_, i) => i),
    WINDSPD: Array(21).fill(15),
    WINDDIR: Array(21).fill(270),
    GUST: Array(21).fill(20),
    TMP: Array(21).fill(25),
    TCDC: Array(21).fill(0),
    APCP1: Array(21).fill(0),
    FLHGT: Array(21).fill(0),
    SLP: Array(21).fill(1013),
    HCDC: Array(21).fill(0),
    MCDC: Array(21).fill(0),
    LCDC: Array(21).fill(0),
    RH: Array(21).fill(50),
    SLHGT: Array(21).fill(0),
    PCPT: Array(21).fill(0),
    TMPE: Array(21).fill(25),
    vars: ["WINDSPD", "WINDDIR", "GUST"],
    initdate: "2030-06-15 00:00:00",
    init_d: "15",
    init_dm: "15.06.",
    init_h: "00",
    initstr: "",
    model_name: "GFS 13km",
    model_longname: "GFS 13km",
    id_model: 3,
    update_last: "",
    update_next: "",
    img_var_map: [],
  },
  fcst_sea: {
    GUST: Array(21).fill(20),
    WINDSPD: Array(21).fill(15),
    WINDDIR: Array(21).fill(270),
  },
  fcst_land: {
    TMP: Array(21).fill(25),
    TMPE: Array(21).fill(25),
  },
  default_vars: { "43": ["WINDSPD"] },
} as APIRoot;

// --- Test Helpers ---

let originalFetch: typeof globalThis.fetch;

function installFetchMock(responder?: (url: URL) => Response | null) {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request, _init?: RequestInit) => {
    const url = new URL(input.toString());

    if (responder) {
      const custom = responder(url);
      if (custom) return custom;
    }

    // Open-Meteo APIs
    if (url.hostname === "api.open-meteo.com") {
      return new Response(JSON.stringify(mockOpenMeteoForecast));
    }
    if (url.hostname === "marine-api.open-meteo.com") {
      return new Response(JSON.stringify(mockOpenMeteoMarine));
    }

    // Windguru APIs (for fallback)
    const params = Object.fromEntries(url.searchParams);
    if (params.q === "forecast_spot") {
      return new Response(JSON.stringify(mockWindguruSpotInfo));
    }
    if (params.q === "forecast") {
      return new Response(JSON.stringify(mockWindguruAPIRoot));
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

function mockReq(path: string): VercelRequest {
  return {
    url: path,
    headers: { host: "localhost:3000" },
  } as unknown as VercelRequest;
}

function mockRes() {
  const result: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    json: unknown;
  } = {
    statusCode: 200,
    headers: {},
    body: "",
    json: undefined,
  };

  const res = {
    setHeader(name: string, value: string) {
      result.headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      result.statusCode = code;
      return res;
    },
    send(body: string) {
      result.body = body;
      return res;
    },
    json(data: unknown) {
      result.json = data;
      result.body = JSON.stringify(data);
      result.headers["content-type"] = "application/json";
      return res;
    },
  } as unknown as VercelResponse;

  return { res, result };
}

// --- Tests ---

describe("Open-Meteo provider integration", () => {
  it("successfully fetches Open-Meteo data and returns ICS calendar", async () => {
    installFetchMock();
    try {
      const req = mockReq("/api/calendar?location=tel-aviv&model=om_gfs&windMin=10");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      expect(result.headers["content-type"]).toBe("text/calendar; charset=utf-8");
      expect(result.headers["x-data-source"]).toBe("openmeteo");
      expect(result.headers["x-fallback-used"]).toBeUndefined();
      expect(result.body.includes("BEGIN:VCALENDAR")).toBe(true);
      expect(result.body.includes("BEGIN:VEVENT")).toBe(true);
    } finally {
      restoreFetch();
    }
  });

  it("supports all Open-Meteo models (om_gfs, om_icon, om_gdps, om_ifs)", async () => {
    const models = ["om_gfs", "om_icon", "om_gdps", "om_ifs"];

    for (const model of models) {
      installFetchMock();
      try {
        const req = mockReq(`/api/calendar?location=tel-aviv&model=${model}&windMin=10`);
        const { res, result } = mockRes();

        await handler(req, res);

        expect(result.statusCode).toBe(200);
        expect(result.headers["x-data-source"]).toBe("openmeteo");
      } finally {
        restoreFetch();
      }
    }
  });

  it("falls back to Windguru when Open-Meteo forecast API fails", async () => {
    installFetchMock((url) => {
      // Open-Meteo forecast fails, marine and Windguru succeed
      if (url.hostname === "api.open-meteo.com") {
        return new Response("Open-Meteo API error", { status: 500 });
      }
      return null; // Use default mocks
    });

    try {
      const req = mockReq("/api/calendar?location=tel-aviv&model=om_gfs&windMin=10");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      expect(result.headers["x-data-source"]).toBe("windguru");
      expect(result.headers["x-fallback-used"]).toBe("true");
      expect(result.body.includes("BEGIN:VCALENDAR")).toBe(true);
    } finally {
      restoreFetch();
    }
  });

  it("returns 502 when both Open-Meteo and Windguru fallback fail", async () => {
    installFetchMock(() => {
      // All APIs fail
      return new Response("All APIs down", { status: 500 });
    });

    try {
      const req = mockReq("/api/calendar?location=tel-aviv&model=om_gfs&windMin=10");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(502);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_DOWN");
      expect(body.error).toBeTruthy();
    } finally {
      restoreFetch();
    }
  });

  it("handles Open-Meteo validation errors", async () => {
    installFetchMock((url) => {
      if (url.hostname === "api.open-meteo.com") {
        return new Response(
          JSON.stringify({
            error: true,
            reason: "Invalid model parameter",
          }),
          { status: 400 },
        );
      }
      return null;
    });

    try {
      const req = mockReq("/api/calendar?location=tel-aviv&model=om_gfs&windMin=10");
      const { res, result } = mockRes();

      await handler(req, res);

      // Should fall back to Windguru
      expect(result.statusCode).toBe(200);
      expect(result.headers["x-data-source"]).toBe("windguru");
      expect(result.headers["x-fallback-used"]).toBe("true");
    } finally {
      restoreFetch();
    }
  });

  it("handles marine API failure gracefully (non-fatal)", async () => {
    installFetchMock((url) => {
      if (url.hostname === "marine-api.open-meteo.com") {
        return new Response("Marine API error", { status: 500 });
      }
      return null;
    });

    try {
      const req = mockReq("/api/calendar?location=tel-aviv&model=om_gfs&windMin=10");
      const { res, result } = mockRes();

      await handler(req, res);

      // Should succeed with wind data only (no wave data)
      expect(result.statusCode).toBe(200);
      expect(result.headers["x-data-source"]).toBe("openmeteo");
      expect(result.headers["x-fallback-used"]).toBeUndefined();
    } finally {
      restoreFetch();
    }
  });

  it("does NOT fall back from Windguru to Open-Meteo", async () => {
    installFetchMock(() => {
      // All APIs fail
      return new Response("API error", { status: 500 });
    });

    try {
      // Request Windguru model explicitly
      const req = mockReq("/api/calendar?location=tel-aviv&model=3&windMin=10");
      const { res, result } = mockRes();

      await handler(req, res);

      // Should fail without trying Open-Meteo
      expect(result.statusCode).toBe(502);
      expect(result.headers["x-fallback-used"]).toBeUndefined();
    } finally {
      restoreFetch();
    }
  });

  it("applies wind filters correctly to Open-Meteo data", async () => {
    installFetchMock();
    try {
      // Set windMin=20 (higher than our mock data of 15kn during daylight)
      const req = mockReq("/api/calendar?location=tel-aviv&model=om_gfs&windMin=20");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      expect(result.body.includes("BEGIN:VCALENDAR")).toBe(true);
      // No events should pass the filter
      expect(result.body.includes("BEGIN:VEVENT")).toBe(false);
    } finally {
      restoreFetch();
    }
  });

  it("includes wave height in events when marine API succeeds", async () => {
    installFetchMock();
    try {
      const req = mockReq("/api/calendar?location=tel-aviv&model=om_gfs&windMin=10");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      // Check that wave height appears in event summary (e.g., "1.2m waves")
      expect(result.body).toContain("waves");
    } finally {
      restoreFetch();
    }
  });

  it("returns correct cache headers for Open-Meteo responses", async () => {
    installFetchMock();
    try {
      const req = mockReq("/api/calendar?location=tel-aviv&model=om_gfs&windMin=10");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      expect(result.headers["cache-control"]).toBe(
        "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
      );
    } finally {
      restoreFetch();
    }
  });
});
