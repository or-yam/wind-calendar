import { describe, it, expect } from "vitest";
import {
  MODELS,
  isValidModelId,
  isWindguruModelId,
  isOpenMeteoModelId,
  getProvider,
  getOpenMeteoSlug,
  getWindguruFallback,
} from "../../../shared/models";

describe("MODELS constant", () => {
  it("contains expected Windguru models", () => {
    expect(MODELS[3]).toBeDefined();
    expect(MODELS[45]).toBeDefined();
    expect(MODELS[59]).toBeDefined();
    expect(MODELS[117]).toBeDefined();
  });

  it("contains expected Open-Meteo models", () => {
    expect(MODELS.om_gfs).toBeDefined();
    expect(MODELS.om_icon).toBeDefined();
    expect(MODELS.om_gdps).toBeDefined();
    expect(MODELS.om_ifs).toBeDefined();
  });
});

describe("isValidModelId", () => {
  describe("happy path - valid Windguru IDs", () => {
    it("returns true for model ID 3", () => {
      expect(isValidModelId(3)).toBe(true);
    });

    it("returns true for model ID 45", () => {
      expect(isValidModelId(45)).toBe(true);
    });

    it("returns true for model ID 59", () => {
      expect(isValidModelId(59)).toBe(true);
    });

    it("returns true for model ID 117", () => {
      expect(isValidModelId(117)).toBe(true);
    });
  });

  describe("happy path - valid Open-Meteo IDs", () => {
    it("returns true for model ID om_gfs", () => {
      expect(isValidModelId("om_gfs")).toBe(true);
    });

    it("returns true for model ID om_icon", () => {
      expect(isValidModelId("om_icon")).toBe(true);
    });

    it("returns true for model ID om_gdps", () => {
      expect(isValidModelId("om_gdps")).toBe(true);
    });

    it("returns true for model ID om_ifs", () => {
      expect(isValidModelId("om_ifs")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("returns false for edge numeric ID 0", () => {
      expect(isValidModelId(0)).toBe(false);
    });

    it("returns false for edge numeric ID 1", () => {
      expect(isValidModelId(1)).toBe(false);
    });

    it("returns false for edge numeric ID 2", () => {
      expect(isValidModelId(2)).toBe(false);
    });

    it("returns false for invalid string with om_ prefix", () => {
      expect(isValidModelId("om_unknown")).toBe(false);
    });

    it("returns false for model ID beyond 117", () => {
      expect(isValidModelId(118)).toBe(false);
    });
  });

  describe("error handling", () => {
    it("returns false for invalid ID -999", () => {
      expect(isValidModelId(-999)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isValidModelId(undefined as unknown as number | string)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isValidModelId(null as unknown as number | string)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidModelId("")).toBe(false);
    });
  });
});

describe("isWindguruModelId", () => {
  it("returns true for numeric Windguru IDs", () => {
    expect(isWindguruModelId(3)).toBe(true);
    expect(isWindguruModelId(45)).toBe(true);
    expect(isWindguruModelId(59)).toBe(true);
    expect(isWindguruModelId(117)).toBe(true);
  });

  it("returns false for string Open-Meteo IDs", () => {
    expect(isWindguruModelId("om_gfs")).toBe(false);
    expect(isWindguruModelId("om_icon")).toBe(false);
  });
});

describe("isOpenMeteoModelId", () => {
  it("returns true for string Open-Meteo IDs", () => {
    expect(isOpenMeteoModelId("om_gfs")).toBe(true);
    expect(isOpenMeteoModelId("om_icon")).toBe(true);
    expect(isOpenMeteoModelId("om_gdps")).toBe(true);
    expect(isOpenMeteoModelId("om_ifs")).toBe(true);
  });

  it("returns false for numeric Windguru IDs", () => {
    expect(isOpenMeteoModelId(3)).toBe(false);
    expect(isOpenMeteoModelId(45)).toBe(false);
  });
});

describe("getProvider", () => {
  it("returns windguru for Windguru model IDs", () => {
    expect(getProvider(3)).toBe("windguru");
    expect(getProvider(45)).toBe("windguru");
    expect(getProvider(59)).toBe("windguru");
    expect(getProvider(117)).toBe("windguru");
  });

  it("returns openmeteo for Open-Meteo model IDs", () => {
    expect(getProvider("om_gfs")).toBe("openmeteo");
    expect(getProvider("om_icon")).toBe("openmeteo");
    expect(getProvider("om_gdps")).toBe("openmeteo");
    expect(getProvider("om_ifs")).toBe("openmeteo");
  });
});

describe("getOpenMeteoSlug", () => {
  it("returns correct slug for om_gfs", () => {
    expect(getOpenMeteoSlug("om_gfs")).toBe("gfs_global");
  });

  it("returns correct slug for om_icon", () => {
    expect(getOpenMeteoSlug("om_icon")).toBe("icon_global");
  });

  it("returns correct slug for om_gdps", () => {
    expect(getOpenMeteoSlug("om_gdps")).toBe("gem_global");
  });

  it("returns correct slug for om_ifs", () => {
    expect(getOpenMeteoSlug("om_ifs")).toBe("ecmwf_ifs025");
  });
});

describe("getWindguruFallback", () => {
  it("returns correct Windguru fallback for om_gfs", () => {
    const fallback = getWindguruFallback("om_gfs");
    expect(fallback).toBe(3); // GFS 13 km matches
  });

  it("returns correct Windguru fallback for om_icon", () => {
    const fallback = getWindguruFallback("om_icon");
    expect(fallback).toBe(45); // ICON 13 km matches
  });

  it("returns correct Windguru fallback for om_gdps", () => {
    const fallback = getWindguruFallback("om_gdps");
    expect(fallback).toBe(59); // GDPS 15 km matches
  });

  it("returns correct Windguru fallback for om_ifs", () => {
    const fallback = getWindguruFallback("om_ifs");
    expect(fallback).toBe(117); // IFS-HRES 9 km matches
  });
});
