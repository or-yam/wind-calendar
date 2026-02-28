import { describe, it } from "vitest";
import { assert, expect } from "vitest";
import { parseQueryParams, resolveLocation, DEFAULTS } from "../server/config";

describe("parseQueryParams", () => {
  it("returns defaults when no params given", () => {
    const params = new URLSearchParams();
    const config = parseQueryParams(params);

    assert.equal(config.windMin, DEFAULTS.windMin);
    assert.equal(config.windMax, DEFAULTS.windMax);
    assert.equal(config.minSessionHours, DEFAULTS.minSessionHours);
    assert.equal(config.model, DEFAULTS.model);
    assert.equal(config.location, "beit-yanai");
  });

  it("overrides windMin from URL param", () => {
    const params = new URLSearchParams("windMin=15");
    const config = parseQueryParams(params);

    assert.equal(config.windMin, 15);
  });

  it("rejects unknown location", () => {
    const params = new URLSearchParams("location=atlantis");

    assert.throws(
      () => parseQueryParams(params),
      (err: Error) => {
        assert.match(err.message, /Unknown location.*"atlantis"/);
        return true;
      },
    );
  });
});

describe("resolveLocation", () => {
  it("returns correct spotId and tz for 'beit-yanai'", () => {
    const loc = resolveLocation("beit-yanai");

    assert.equal(loc.spotId, "771");
    assert.equal(loc.tz, "Asia/Jerusalem");
  });

  it("throws for unknown location name", () => {
    assert.throws(
      () => resolveLocation("narnia"),
      (err: Error) => {
        assert.match(err.message, /Unknown location.*"narnia"/);
        return true;
      },
    );
  });
});
