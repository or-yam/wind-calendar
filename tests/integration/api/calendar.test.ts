import { test } from "vitest";
import { assert, expect } from "vitest";
import handler from "../../../api/calendar";
import type { SpotInfo } from "../../../server/types/forecast";
import type { APIRoot } from "../../../server/types/api-response";
import type { VercelRequest, VercelResponse } from "@vercel/node";

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
// That's a date where daylight hours (7-18 Asia/Jerusalem = 4-15 UTC) will work.
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
// 21 hourly points (hours 3-23) + 6 three-hourly points (24,27,30,33,36,39) = 27 points.
const realisticHours = [
  ...Array.from({ length: 21 }, (_, i) => i + 3), // 3,4,5,...,23
  24,
  27,
  30,
  33,
  36,
  39,
];

// Asia/Jerusalem is UTC+3 in June, so UTC hour 4 = local 7, UTC hour 15 = local 18.
// Put 15kn wind at hour offsets 4-14 (local 7-17), rest 5kn.
const goodWindSpeeds = realisticHours.map((h) => (h >= 4 && h <= 14 ? 15 : 5));

const mockAPIRoot = buildMockAPIRoot(goodWindSpeeds, realisticHours);

// --- Helpers ---

let originalFetch: typeof globalThis.fetch;

function installFetchMock(responder?: (url: URL) => Response | null) {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
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

/** Build a minimal VercelRequest-like object. */
function mockReq(path: string): VercelRequest {
  return {
    url: path,
    headers: { host: "localhost:3000" },
  } as unknown as VercelRequest;
}

/** Build a minimal VercelResponse-like object that captures the response. */
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

test("calendar API handler", async (t) => {
  await t.test("full pipeline: returns ICS with events", async () => {
    installFetchMock();
    try {
      const req = mockReq("/api/calendar");
      const { res, result } = mockRes();

      await handler(req, res);

      assert.equal(result.statusCode, 200);
      assert.equal(result.headers["content-type"], "text/calendar; charset=utf-8");
      assert.equal(
        result.headers["cache-control"],
        "public, max-age=21600, stale-while-revalidate=86400, stale-if-error=604800",
      );
      assert.ok(result.body.includes("BEGIN:VCALENDAR"), "Body should contain BEGIN:VCALENDAR");
    } finally {
      restoreFetch();
    }
  });

  await t.test("unknown location returns 400", async () => {
    installFetchMock();
    try {
      const req = mockReq("/api/calendar?location=unknown");
      const { res, result } = mockRes();

      await handler(req, res);

      assert.equal(result.statusCode, 400);
      const body = JSON.parse(result.body);
      assert.ok(
        body.error.includes("Unknown location"),
        `Expected error about unknown location, got: ${body.error}`,
      );
    } finally {
      restoreFetch();
    }
  });

  await t.test("Windguru failure returns 502 with structured error", async () => {
    installFetchMock(() => {
      // All fetches fail
      return new Response("Internal Server Error", { status: 500 });
    });
    try {
      const req = mockReq("/api/calendar");
      const { res, result } = mockRes();

      await handler(req, res);

      assert.equal(result.statusCode, 502);
      const body = JSON.parse(result.body);
      assert.equal(body.code, "WINDGURU_DOWN");
      assert.equal(body.error, "Windguru is temporarily unavailable");
      assert.ok(body.suggestion, "Should include a suggestion");
      assert.ok(body.debug?.spotId, "Should include spotId in debug");
      assert.equal(body.debug.upstreamStatus, 500);
    } finally {
      restoreFetch();
    }
  });

  await t.test("query param overrides work", async () => {
    // Use windMin=20 — our mock wind is 15kn, so nothing passes the filter.
    // Result: valid ICS but no VEVENT blocks.
    installFetchMock();
    try {
      const req = mockReq("/api/calendar?windMin=20");
      const { res, result } = mockRes();

      await handler(req, res);

      assert.equal(result.statusCode, 200);
      assert.ok(result.body.includes("BEGIN:VCALENDAR"), "Should still return valid ICS");
      assert.ok(
        !result.body.includes("BEGIN:VEVENT"),
        "Should have no events with windMin=20 (mock wind is 15kn)",
      );
    } finally {
      restoreFetch();
    }
  });

  await t.test("ICS contains calendar events for valid wind data", async () => {
    installFetchMock();
    try {
      const req = mockReq("/api/calendar");
      const { res, result } = mockRes();

      await handler(req, res);

      assert.equal(result.statusCode, 200);
      assert.ok(result.body.includes("BEGIN:VEVENT"), "Should contain at least one VEVENT");
      assert.ok(result.body.includes("END:VEVENT"), "Should contain END:VEVENT");
      assert.ok(result.body.includes("END:VCALENDAR"), "Should contain END:VCALENDAR");
    } finally {
      restoreFetch();
    }
  });

  // --- Error path tests ---

  await t.test("Windguru 429 returns 429 with rate limit info", async () => {
    installFetchMock(() => new Response("Rate limited", { status: 429 }));
    try {
      const req = mockReq("/api/calendar");
      const { res, result } = mockRes();

      await handler(req, res);

      assert.equal(result.statusCode, 429);
      const body = JSON.parse(result.body);
      assert.equal(body.code, "WINDGURU_RATE_LIMIT");
      assert.ok(body.suggestion?.includes("5 minutes"));
    } finally {
      restoreFetch();
    }
  });

  await t.test("Windguru 403 returns 502 with forbidden info", async () => {
    installFetchMock(() => new Response("Forbidden", { status: 403 }));
    try {
      const req = mockReq("/api/calendar");
      const { res, result } = mockRes();

      await handler(req, res);

      assert.equal(result.statusCode, 502);
      const body = JSON.parse(result.body);
      assert.equal(body.code, "WINDGURU_FORBIDDEN");
    } finally {
      restoreFetch();
    }
  });

  await t.test("Windguru 404 returns 502 with not found info", async () => {
    installFetchMock(() => new Response("Not Found", { status: 404 }));
    try {
      const req = mockReq("/api/calendar");
      const { res, result } = mockRes();

      await handler(req, res);

      assert.equal(result.statusCode, 502);
      const body = JSON.parse(result.body);
      assert.equal(body.code, "WINDGURU_NOT_FOUND");
      assert.ok(body.suggestion?.includes("spot ID"));
    } finally {
      restoreFetch();
    }
  });

  await t.test("network failure returns 504 with unreachable info", async () => {
    installFetchMock(() => {
      throw new TypeError("fetch failed");
    });
    try {
      const req = mockReq("/api/calendar");
      const { res, result } = mockRes();

      await handler(req, res);

      assert.equal(result.statusCode, 504);
      const body = JSON.parse(result.body);
      assert.equal(body.code, "WINDGURU_UNREACHABLE");
      assert.ok(body.debug?.spotId, "Should include spotId");
    } finally {
      restoreFetch();
    }
  });

  await t.test("malformed JSON response returns 502 with bad response info", async () => {
    installFetchMock(() => new Response("not json {{{", { status: 200 }));
    try {
      const req = mockReq("/api/calendar");
      const { res, result } = mockRes();

      await handler(req, res);

      assert.equal(result.statusCode, 502);
      const body = JSON.parse(result.body);
      assert.equal(body.code, "WINDGURU_BAD_RESPONSE");
      assert.ok(body.debug?.upstreamStatus === 200);
    } finally {
      restoreFetch();
    }
  });

  await t.test("wave model failure is non-fatal — still returns ICS", async () => {
    installFetchMock((url) => {
      const params = Object.fromEntries(url.searchParams);
      // Wave model (84) fails, wind model (3) succeeds
      if (params.q === "forecast" && params.id_model === "84") {
        return new Response("Wave model error", { status: 500 });
      }
      return null; // fall through to default mock
    });
    try {
      const req = mockReq("/api/calendar");
      const { res, result } = mockRes();

      await handler(req, res);

      assert.equal(result.statusCode, 200);
      assert.ok(result.body.includes("BEGIN:VCALENDAR"), "Should still return valid ICS");
    } finally {
      restoreFetch();
    }
  });

  await t.test("all error responses include debug.spotId", async () => {
    const errorResponders: Array<{ name: string; responder: () => Response }> = [
      { name: "500", responder: () => new Response("error", { status: 500 }) },
      { name: "429", responder: () => new Response("error", { status: 429 }) },
      { name: "403", responder: () => new Response("error", { status: 403 }) },
      { name: "404", responder: () => new Response("error", { status: 404 }) },
    ];

    for (const { name, responder } of errorResponders) {
      installFetchMock(() => responder());
      try {
        const req = mockReq("/api/calendar");
        const { res, result } = mockRes();

        await handler(req, res);

        const body = JSON.parse(result.body);
        assert.ok(body.debug?.spotId, `${name} response should include debug.spotId`);
        assert.ok(body.code, `${name} response should include error code`);
      } finally {
        restoreFetch();
      }
    }
  });
});
