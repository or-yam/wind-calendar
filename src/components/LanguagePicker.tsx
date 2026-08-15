import { useTranslation } from "react-i18next";
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
    <div className="content-wrap flex items-center gap-2 pt-4">
      <label htmlFor="language-picker" className="text-sm font-bold">
        {t("language")}
      </label>
      <select
        id="language-picker"
        value={locale}
        onChange={(event) => onChange(event.target.value as Locale)}
        className="h-10 rounded-sm border-2 border-input bg-card px-3 text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="en">{t("english")}</option>
        <option value="he">{t("hebrew")}</option>
      </select>
    </div>
  );
}
