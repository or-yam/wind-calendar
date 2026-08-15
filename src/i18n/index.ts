import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./resources/en";
import { he } from "./resources/he";
import { localeMetadata, resolveLocale, type Locale } from "./locale";

export const resources = { en: { translation: en }, he: { translation: he } } as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLocale(window.location.search),
  fallbackLng: "en",
  supportedLngs: ["en", "he"],
  interpolation: { escapeValue: false },
  keySeparator: false,
  initAsync: false,
});

export function applyDocumentLocale(locale: Locale) {
  const metadata = localeMetadata[locale];
  document.documentElement.lang = locale;
  document.documentElement.dir = metadata.direction;
  document.title = "Wind Calendar";
  document
    .querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.setAttribute("content", i18n.t("documentDescription", { lng: locale }));
}

applyDocumentLocale(i18n.language as Locale);

export default i18n;
