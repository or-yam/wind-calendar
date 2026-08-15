export const LOCALES = ["en", "he"] as const;
export type Locale = (typeof LOCALES)[number];

export const localeMetadata = {
  en: { intl: "en-US", direction: "ltr" },
  he: { intl: "he-IL", direction: "rtl" },
} as const satisfies Record<Locale, { intl: string; direction: "ltr" | "rtl" }>;

export function resolveLocale(search: string): Locale {
  return new URLSearchParams(search).get("lang") === "he" ? "he" : "en";
}

export function addLocaleParam(params: URLSearchParams, locale: Locale): URLSearchParams {
  const next = new URLSearchParams(params);
  if (locale === "he") next.set("lang", "he");
  else next.delete("lang");
  return next;
}
