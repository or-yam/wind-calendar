import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readStoredLocale, storeLocale } from "../../../src/i18n/locale";

describe("locale preference", () => {
  const getItem = vi.fn();
  const setItem = vi.fn();

  beforeEach(() => {
    getItem.mockReset();
    setItem.mockReset();
    vi.stubGlobal("localStorage", { getItem, setItem });
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [null, "en"],
    ["en", "en"],
    ["he", "he"],
    ["fr", "en"],
  ] as const)("resolves stored %s to %s", (stored, expected) => {
    getItem.mockReturnValue(stored);
    expect(readStoredLocale()).toBe(expected);
  });

  it("persists both language choices", () => {
    storeLocale("he");
    expect(setItem).toHaveBeenLastCalledWith("wind-calendar:locale", "he");
    storeLocale("en");
    expect(setItem).toHaveBeenLastCalledWith("wind-calendar:locale", "en");
  });

  it("defaults to English when storage is unavailable and allows changes", () => {
    getItem.mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    setItem.mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    expect(readStoredLocale()).toBe("en");
    expect(() => storeLocale("he")).not.toThrow();
  });
});
