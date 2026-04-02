import type { SpotInfo } from "../../server/types/forecast";
import type { APIRoot } from "../../server/types/api-response";

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

export const realisticHours = [
  ...Array.from({ length: 21 }, (_, i) => i + 3),
  24,
  27,
  30,
  33,
  36,
  39,
];

export const goodWindSpeeds = realisticHours.map((h) => (h >= 4 && h <= 14 ? 15 : 5));

export const mockAPIRoot = buildMockAPIRoot(goodWindSpeeds, realisticHours);

export const mockWindData = buildMockAPIRoot(goodWindSpeeds, realisticHours);

export function createWindguruMockModule() {
  return {
    fetchWindData: vi.fn().mockImplementation(async (locationCode: string, _modelId: number) => {
      if (locationCode === "unknown") {
        const error = new Error("Unknown location");
        (error as any).status = 404;
        throw error;
      }
      return {
        windData: mockWindData.fcst.WINDSPD.map((windSpeed, i) => ({
          date: new Date((mockWindData.fcst.initstamp + mockWindData.fcst.hours[i] * 3600) * 1000),
          windSpeed,
          windGusts: mockWindData.fcst.GUST?.[i] ?? null,
          windDirection: mockWindData.fcst.WINDDIR?.[i] ?? null,
          waveHeight: null,
          wavePeriod: null,
          waveDirection: null,
          swellHeight: null,
          swellPeriod: null,
          swellDirection: null,
        })),
        sunrise: mockWindData.sunrise,
        sunset: mockWindData.sunset,
      };
    }),
  };
}
