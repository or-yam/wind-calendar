export const LOCALES = ["en", "he"] as const;
export type Locale = (typeof LOCALES)[number];

export const localeMetadata = {
  en: { intl: "en-US", direction: "ltr" },
  he: { intl: "he-IL", direction: "rtl" },
} as const satisfies Record<Locale, { intl: string; direction: "ltr" | "rtl" }>;

const STORAGE_KEY = "wind-calendar:locale";

export function readStoredLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === "he" ? "he" : "en";
  } catch {
    return "en";
  }
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    return;
  }
}
