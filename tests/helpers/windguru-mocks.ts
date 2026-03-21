import type { SpotInfo } from "../../server/types/forecast.js";
import type { APIRoot } from "../../server/types/api-response.js";

// initstamp in 2030, starting at midnight UTC on June 15, 2030
// That's a date where daylight hours (7-18 Asia/Jerusalem = 4-15 UTC) will work.
export const FUTURE_INITSTAMP = Math.floor(new Date("2030-06-15T00:00:00Z").getTime() / 1000);

export const mockSpotInfo: SpotInfo = {
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

export function buildMockAPIRoot(windSpeeds: number[], hours?: number[]): APIRoot {
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
export const realisticHours = [
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
export const goodWindSpeeds = realisticHours.map((h) => (h >= 4 && h <= 14 ? 15 : 5));

export const mockAPIRoot = buildMockAPIRoot(goodWindSpeeds, realisticHours);

/**
 * Install a global fetch mock for Windguru API requests.
 * Returns cleanup function to restore original fetch.
 *
 * @param responder - Optional custom responder for specific test cases.
 *                    Return null to fall through to default mock.
 */
export function installWindguruMock(responder?: (url: URL) => Response | null): () => void {
  const originalFetch = globalThis.fetch;

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

  return () => {
    globalThis.fetch = originalFetch;
  };
}
