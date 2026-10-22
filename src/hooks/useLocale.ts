import { useTranslation } from "react-i18next";
import { localeMetadata, type Locale } from "@/i18n/locale";

export function useLocale() {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.resolvedLanguage === "he" ? "he" : "en";
  return { t, locale, ...localeMetadata[locale] };
}
