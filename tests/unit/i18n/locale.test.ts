import { describe, expect, it } from "vitest";
import { addLocaleParam, resolveLocale } from "../../../src/i18n/locale";

describe("locale URL state", () => {
  it.each([
    ["", "en"],
    ["?lang=en", "en"],
    ["?lang=he", "he"],
    ["?lang=fr", "en"],
  ] as const)("resolves %s to %s", (search, expected) => {
    expect(resolveLocale(search)).toBe(expected);
  });

  it("adds Hebrew without changing configuration params", () => {
    const params = new URLSearchParams("locations=tel-aviv&model=om_gfs");
    expect(addLocaleParam(params, "he").toString()).toBe("locations=tel-aviv&model=om_gfs&lang=he");
    expect(params.has("lang")).toBe(false);
  });

  it("omits English and removes unsupported locale state", () => {
    const params = new URLSearchParams("locations=tel-aviv&lang=fr");
    expect(addLocaleParam(params, "en").toString()).toBe("locations=tel-aviv");
  });
});
