import { useTranslation } from "react-i18next";
import { ChevronDown, Languages } from "lucide-react";
import type { Locale } from "@/i18n/locale";

export function LanguagePicker({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="content-wrap flex pt-3">
      <label htmlFor="language-picker" className="sr-only">
        {t("language")}
      </label>
      <div className="relative inline-flex items-center text-card-foreground">
        <Languages aria-hidden="true" className="pointer-events-none absolute start-2 size-4" />
        <select
          id="language-picker"
          value={locale}
          onChange={(event) => onChange(event.target.value as Locale)}
          className="h-8 appearance-none rounded-md border border-input bg-card pe-7 ps-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="en" lang="en" dir="ltr">
            English
          </option>
          <option value="he" lang="he" dir="rtl">
            עברית
          </option>
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-2 size-3" />
      </div>
    </div>
  );
}
