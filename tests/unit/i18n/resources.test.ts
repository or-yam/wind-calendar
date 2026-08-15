import { describe, expect, it } from "vitest";
import i18n from "../../../src/i18n";
import { en } from "../../../src/i18n/resources/en";
import { he } from "../../../src/i18n/resources/he";

describe("translation resources", () => {
  it("keeps English and Hebrew resource keys in parity", () => {
    expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort());
  });

  it("interpolates translated values", () => {
    expect(i18n.t("windDirection", { lng: "he", direction: "NW" })).toBe("כיוון רוח NW");
  });

  it("uses Hebrew plural forms", () => {
    expect(i18n.t("locationsSelected", { lng: "he", count: 1 })).toContain("מיקום 1");
    expect(i18n.t("locationsSelected", { lng: "he", count: 2 })).toContain("2 מיקומים");
  });
});
