import { describe, it, expect } from "vitest";
import handler from "../../../api/forecast";
import type { SpotInfo } from "../../../server/types/forecast";
import type { APIRoot } from "../../../server/types/api-response";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ForecastResponse } from "../../../shared/forecast-types";

// --- Mock Windguru data ---

const mockSpotInfo: SpotInfo = {
  tabs: [
    {
      id_spot: "771",
      lat: 32.38,
      lon: 34.87,
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
    "771": {
      id_spot: "771",
      id_user: "1",
      spotname: "Beit Yanai",
      country: "Israel",
      id_country: 1,
      lat: 32.38,
      lon: 34.87,
      alt: 0,
      tz: "Asia/Jerusalem",
      tzid: "Asia/Jerusalem",
      gmt_hour_offset: 2,
      sunrise: "06:00",
      sunset: "19:00",
      sst: 20,
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

// initstamp in 2030, starting at midnight UTC on June 15, 2030
const FUTURE_INITSTAMP = Math.floor(new Date("2030-06-15T00:00:00Z").getTime() / 1000);

function buildMockAPIRoot(windSpeeds: number[], hours?: number[]): APIRoot {
  const len = windSpeeds.length;
  return {
    id_spot: 771,
    lat: 32.38,
    lon: 34.87,
    alt: 0,
    id_model: 3,
    model: "GFS",
    model_alt: 0,
    levels: 1,
    sunrise: "06:00",
    sunset: "19:00",
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
      hr_end: len - 1,
      hr_step: 1,
      wave: false,
      maps: false,
      dynamic_updates: false,
      rundef: "run1",
      runs: [],
    },
    fcst: {
      initstamp: FUTURE_INITSTAMP,
      hours: hours ?? Array.from({ length: len }, (_, i) => i),
      WINDSPD: windSpeeds,
      WINDDIR: Array(len).fill(270),
      GUST: windSpeeds.map((s) => s + 5),
      TMP: Array(len).fill(25),
      TCDC: Array(len).fill(0),
      APCP1: Array(len).fill(0),
      FLHGT: Array(len).fill(0),
      SLP: Array(len).fill(1013),
      HCDC: Array(len).fill(0),
      MCDC: Array(len).fill(0),
      LCDC: Array(len).fill(0),
      RH: Array(len).fill(50),
      SLHGT: Array(len).fill(0),
      PCPT: Array(len).fill(0),
      TMPE: Array(len).fill(25),
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
      GUST: windSpeeds.map((s) => s + 5),
      WINDSPD: windSpeeds,
      WINDDIR: Array(len).fill(270),
    },
    fcst_land: {
      TMP: Array(len).fill(25),
      TMPE: Array(len).fill(25),
    },
    default_vars: { "43": ["WINDSPD"] },
  } as APIRoot;
}

// Realistic Windguru-style offsets: hourly 3..23, then 3-hourly 24,27,30,...
const realisticHours = [
  ...Array.from({ length: 21 }, (_, i) => i + 3), // 3-23
  24,
  27,
  30,
  33,
  36,
  39,
];

// Asia/Jerusalem is UTC+3 in June, so UTC hour 4 = local 7, UTC hour 15 = local 18.
const goodWindSpeeds = realisticHours.map((h) => (h >= 4 && h <= 14 ? 15 : 5));

const mockAPIRoot = buildMockAPIRoot(goodWindSpeeds, realisticHours);

// --- Helpers ---

let originalFetch: typeof globalThis.fetch;

function installFetchMock(responder?: (url: URL) => Response | null) {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request, _init?: RequestInit) => {
    const url = new URL(input.toString());
    const params = Object.fromEntries(url.searchParams);

    if (responder) {
      const custom = responder(url);
      if (custom) return custom;
    }

    if (params.q === "forecast_spot") {
      return new Response(JSON.stringify(mockSpotInfo));
    }
    if (params.q === "forecast") {
      return new Response(JSON.stringify(mockAPIRoot));
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
      if (!result.headers["content-type"]) {
        result.headers["content-type"] = "application/json";
      }
      return res;
    },
    end() {
      return res;
    },
  } as unknown as VercelResponse;

  return { res, result };
}

// --- Tests ---

describe("forecast API handler", () => {
  it("full pipeline: returns JSON forecast with sessions", async () => {
    installFetchMock();
    try {
      const req = mockReq("/api/forecast");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      expect(result.headers["content-type"]).toBe("application/json; charset=utf-8");
      expect(result.headers["cache-control"]).toBe(
        "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
      );

      const body = result.json as ForecastResponse;
      expect(body.meta).toBeDefined();
      expect(body.meta.location).toBe("beit-yanai");
      expect(body.meta.dataSource).toBe("windguru");
      expect(body.sessions).toBeInstanceOf(Array);
    } finally {
      restoreFetch();
    }
  });

  it("unknown location returns 400", async () => {
    installFetchMock();
    try {
      const req = mockReq("/api/forecast?location=unknown");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain("Unknown location");
    } finally {
      restoreFetch();
    }
  });

  it("Windguru failure returns 502 with structured error", async () => {
    installFetchMock(() => new Response("Internal Server Error", { status: 500 }));
    try {
      const req = mockReq("/api/forecast");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(502);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_DOWN");
      expect(body.error).toBe("Windguru is temporarily unavailable");
      expect(body.suggestion).toBeTruthy();
      expect(body.debug?.locationInfo).toBeTruthy();
      expect(body.debug.upstreamStatus).toBe(500);
    } finally {
      restoreFetch();
    }
  });

  it("query param overrides work", async () => {
    // windMin=20 — mock wind is 15kn, so no sessions match
    installFetchMock();
    try {
      const req = mockReq("/api/forecast?windMin=20");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      const body = result.json as ForecastResponse;
      expect(body.sessions).toHaveLength(0);
    } finally {
      restoreFetch();
    }
  });

  it("sessions contain wind and wave data", async () => {
    installFetchMock();
    try {
      const req = mockReq("/api/forecast");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      const body = result.json as ForecastResponse;
      expect(body.sessions.length).toBeGreaterThan(0);

      const session = body.sessions[0];
      expect(session.start).toBeDefined();
      expect(session.end).toBeDefined();
      expect(session.wind).toBeDefined();
      expect(session.wind.min).toBeGreaterThan(0);
      expect(session.wind.max).toBeGreaterThanOrEqual(session.wind.min);
      expect(session.hourly).toBeInstanceOf(Array);
      expect(session.hourly.length).toBeGreaterThan(0);
    } finally {
      restoreFetch();
    }
  });

  it("Windguru 429 returns 429 with rate limit info", async () => {
    installFetchMock(() => new Response("Rate limited", { status: 429 }));
    try {
      const req = mockReq("/api/forecast");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(429);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_RATE_LIMIT");
      expect(body.suggestion).toContain("5 minutes");
    } finally {
      restoreFetch();
    }
  });

  it("Windguru 403 returns 502 with forbidden info", async () => {
    installFetchMock(() => new Response("Forbidden", { status: 403 }));
    try {
      const req = mockReq("/api/forecast");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(502);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_FORBIDDEN");
    } finally {
      restoreFetch();
    }
  });

  it("Windguru 404 returns 502 with not found info", async () => {
    installFetchMock(() => new Response("Not Found", { status: 404 }));
    try {
      const req = mockReq("/api/forecast");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(502);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_NOT_FOUND");
      expect(body.suggestion).toContain("spot ID");
    } finally {
      restoreFetch();
    }
  });

  it("network failure returns 504 with unreachable info", async () => {
    installFetchMock(() => {
      throw new TypeError("fetch failed");
    });
    try {
      const req = mockReq("/api/forecast");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(504);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_UNREACHABLE");
      expect(body.debug?.locationInfo).toBeTruthy();
    } finally {
      restoreFetch();
    }
  });

  it("malformed JSON response returns 502 with bad response info", async () => {
    installFetchMock(() => new Response("not json {{{", { status: 200 }));
    try {
      const req = mockReq("/api/forecast");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(502);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_BAD_RESPONSE");
      expect(body.debug?.upstreamStatus).toBe(200);
    } finally {
      restoreFetch();
    }
  });

  it("wave model failure is non-fatal — still returns forecast", async () => {
    installFetchMock((url) => {
      const params = Object.fromEntries(url.searchParams);
      // Wave model (84) fails, wind model (3) succeeds
      if (params.q === "forecast" && params.id_model === "84") {
        return new Response("Wave model error", { status: 500 });
      }
      return null;
    });
    try {
      const req = mockReq("/api/forecast");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      const body = result.json as ForecastResponse;
      expect(body.sessions).toBeDefined();
    } finally {
      restoreFetch();
    }
  });

  it("all error responses include debug.locationInfo", async () => {
    const errorResponders: Array<{ name: string; responder: () => Response }> = [
      { name: "500", responder: () => new Response("error", { status: 500 }) },
      { name: "429", responder: () => new Response("error", { status: 429 }) },
      { name: "403", responder: () => new Response("error", { status: 403 }) },
      { name: "404", responder: () => new Response("error", { status: 404 }) },
    ];

    for (const { responder } of errorResponders) {
      installFetchMock(() => responder());
      try {
        const req = mockReq("/api/forecast");
        const { res, result } = mockRes();

        await handler(req, res);

        const body = JSON.parse(result.body);
        expect(body.debug?.locationInfo).toBeTruthy();
        expect(body.code).toBeTruthy();
      } finally {
        restoreFetch();
      }
    }
  });

  it("X-Data-Source header is set", async () => {
    installFetchMock();
    try {
      const req = mockReq("/api/forecast");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      expect(result.headers["x-data-source"]).toBe("windguru");
    } finally {
      restoreFetch();
    }
  });

  it("hourly conditions include all expected fields", async () => {
    installFetchMock();
    try {
      const req = mockReq("/api/forecast");
      const { res, result } = mockRes();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      const body = result.json as ForecastResponse;
      const session = body.sessions[0];
      const condition = session.hourly[0];

      expect(condition.time).toBeDefined();
      expect(condition.windSpeed).toBeDefined();
      expect(condition.windGusts).toBeDefined();
      expect(condition.windDirection).toBeDefined();
      expect(condition.windDirectionDeg).toBeDefined();
    } finally {
      restoreFetch();
    }
  });
});
