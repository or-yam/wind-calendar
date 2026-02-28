import { test } from "vitest";
import { assert, expect } from "vitest";
import { getForecast } from "../../../server/scraper/forecast";
import type { SpotInfo, ModelForecast } from "../../../server/types/forecast";

const mockSpotInfo: SpotInfo = {
  tabs: [
    {
      id_spot: "771",
      lat: 32.38,
      lon: 34.87,
      id_model: 1,
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
        tide: {
          style: "",
          min: 0,
        },
      },
      id_model_arr: [
        {
          id_model: 1,
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
      spotname: "Tel Aviv",
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
      models: [1, 2],
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

const createMockForecast = (id: number): ModelForecast => ({
  id_model: id,
  model_name: `Model ${id}`,
  resolution: id === 1 ? 27 : 13,
  initdate: new Date().toISOString(),
  forecast: {
    initstamp: Date.now() / 1000,
    hours: [0, 3, 6],
    WINDSPD: [10, 12, 14],
    WINDDIR: [180, 185, 190],
    GUST: [15, 17, 19],
    initdate: new Date().toISOString(),
    model_name: `Model ${id}`,
    id_model: id,
  },
});

test("getForecast", async (t) => {
  await t.test("should return single model forecast when modelId is provided", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = input.toString();
        const urlObj = new URL(url);
        const params = Object.fromEntries(urlObj.searchParams);

        if (params.q === "forecast_spot") {
          return new Response(JSON.stringify(mockSpotInfo));
        }

        if (params.q === "forecast") {
          const modelId = parseInt(params.id_model);
          return new Response(JSON.stringify(createMockForecast(modelId)));
        }

        throw new Error(`Unexpected URL: ${url}`);
      };

      const result = await getForecast("771", 1);
      assert.equal(result.id_model, 1);
      assert.equal("source_models" in result, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("should throw if requested model is not available", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = input.toString();
        const urlObj = new URL(url);
        const params = Object.fromEntries(urlObj.searchParams);

        if (params.q === "forecast_spot") {
          return new Response(JSON.stringify(mockSpotInfo));
        }

        throw new Error(`Unexpected URL: ${url}`);
      };

      await assert.rejects(() => getForecast("771", 999), /Model 999 not available/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  /* await t.test("should handle failed model fetches gracefully", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit
      ) => {
        const url = input.toString();
        const urlObj = new URL(url);
        const params = Object.fromEntries(urlObj.searchParams);

        if (params.q === "forecast_spot") {
          return new Response(JSON.stringify(mockSpotInfo));
        }

        if (params.q === "forecast" && params.id_model === "1") {
          return new Response("Error", { status: 500 });
        }

        const modelId = parseInt(params.id_model);
        return new Response(JSON.stringify(createMockForecast(modelId)));
      };

      const result = await getForecast("771");
      assert.equal("source_models" in result, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }); */

  await t.test("should throw if model fetch fails", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = input.toString();
        const urlObj = new URL(url);
        const params = Object.fromEntries(urlObj.searchParams);

        if (params.q === "forecast_spot") {
          return new Response(JSON.stringify(mockSpotInfo));
        }

        return new Response("Error", { status: 500 });
      };

      await assert.rejects(() => getForecast("771", 1), /Failed to fetch any valid forecasts/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
