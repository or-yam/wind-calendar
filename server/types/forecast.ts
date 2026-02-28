import type { APIRoot } from "./api-response";

export interface SpotInfo {
  tabs: Array<{
    share: boolean;
    id_spot: string;
    lat: number;
    lon: number;
    id_model: number;
    id_model_arr: Array<{
      id_model: number;
      initstr: string;
      rundef: string;
      period: number;
      cachefix: string;
    }>;
    model_period: number;
    blend?: {
      id_blend_settings: number;
      id_user: number;
      name: string;
      lat: any;
      lon: any;
      range: any;
      res_sensitivity: number;
      init_sensitivity: number;
      model_koef: {
        "3": number;
        "4": number;
        "21": number;
        "22": number;
        "23": number;
        "24": number;
        "29": number;
        "32": number;
        "33": number;
        "34": number;
        "36": number;
        "37": number;
        "38": number;
        "39": number;
        "40": number;
        "42": number;
        "43": number;
        "44": number;
        "45": number;
        "48": number;
        "52": number;
        "53": number;
        "54": number;
        "55": number;
        "56": number;
        "57": number;
        "59": number;
        "62": number;
        "63": number;
        "64": number;
        "68": number;
        "69": number;
        "70": number;
        "71": number;
        "72": number;
        "74": number;
        "75": number;
        "80": number;
        "87": number;
        "89": number;
        "90": number;
        "91": number;
        "92": number;
        "93": number;
        "94": number;
        "95": number;
        "96": number;
        "98": number;
        "99": number;
        "101": number;
        "102": number;
        "103": number;
        "104": number;
        "105": number;
        "106": number;
        "107": number;
        "108": number;
        "109": number;
        "114": number;
        "902": number;
        "903": number;
        "904": number;
        "905": number;
        "906": number;
        "907": number;
        "908": number;
        "911": number;
        "914": number;
      };
      mix_range: {
        WINDSPD: number;
        TMPE: number;
        TMP: number;
        TCDC: number;
        CDC: number;
        APCP1: number;
        GUST: number;
        FLHGT: number;
        SLP: number;
        HCDC: number;
        MCDC: number;
        LCDC: number;
        RH: number;
      };
      mix_skip: Array<string>;
      var_map: any;
    };
    id_model_wave?: number;
    options: {
      wj: string;
      tj: string;
      waj: string;
      tij: string;
      odh: number;
      doh: number;
      fhours: number;
      limit1: number;
      limit2: number;
      limit3: number;
      tlimit: number;
      vt: string;
      wrapnew: any;
      show_flhgt_opt: number;
      map_open_fn: string;
      params: Array<string>;
      var_map: any;
      tide: {
        style: string;
        min: number;
      };
      guide?: boolean;
    };
    header?: string;
  }>;
  tabs_hidden: Array<any>;
  spots: {
    [key: string]: {
      id_spot: string;
      id_user: string;
      spotname: string;
      country: string;
      id_country: number;
      lat: number;
      lon: number;
      alt: number;
      tz: string;
      tzid: string;
      gmt_hour_offset: number;
      sunrise: string;
      sunset: string;
      sst: number;
      models: Array<number>;
      tide: {
        "2N2": Array<number>;
        EPS2: Array<number>;
        J1: Array<number>;
        K1: Array<number>;
        K2: Array<number>;
        L2: Array<number>;
        LAMBDA2: Array<number>;
        M2: Array<number>;
        M3: Array<number>;
        M4: Array<number>;
        M6: Array<number>;
        M8: Array<number>;
        MF: Array<number>;
        MKS2: Array<number>;
        MM: Array<number>;
        MN4: Array<number>;
        MS4: Array<number>;
        MSF: Array<number>;
        MSQM: Array<number>;
        MTM: Array<number>;
        MU2: Array<number>;
        N2: Array<number>;
        N4: Array<number>;
        NU2: Array<number>;
        O1: Array<number>;
        P1: Array<number>;
        Q1: Array<number>;
        R2: Array<number>;
        S1: Array<number>;
        S2: Array<number>;
        S4: Array<number>;
        SA: Array<number>;
        SSA: Array<number>;
        T2: Array<number>;
      };
      tides: string;
    };
  };
  message: string;
}

export interface ForecastData {
  initstamp: number;
  hours: number[];
  WINDSPD: number[];
  WINDDIR: number[];
  GUST: number[];
  TMP?: number[];
  RH?: number[];
  APCP1?: number[];
  initdate: string;
  model_name: string;
  id_model: number;
}

export interface ModelForecast {
  id_model: number;
  model_name: string;
  resolution: number;
  initdate: string;
  forecast: ForecastData;
}

export interface MixedForecast extends APIRoot {
  source_models: Array<{
    id_model: number;
    model_name: string;
    weight: number;
  }>;
  mix_timestamp: number;
}

export type ForecastResult = ModelForecast | MixedForecast;

export function isMixedForecast(forecast: ForecastResult): forecast is MixedForecast {
  return "source_models" in forecast;
}
