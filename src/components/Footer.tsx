import { GithubIcon } from "@/components/icons/github";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t-2 border-primary bg-card px-5 py-8">
      <div className="mx-auto max-w-[1080px]">
        <div className="flex justify-between items-center text-sm text-card-foreground mb-3">
          <span dir="ltr">Wind Calendar</span>
          <a
            href="https://github.com/or-yam/wind-calendar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-secondary transition-colors"
            aria-label={t("githubRepository")}
          >
            <GithubIcon size={18} aria-hidden="true" />
          </a>
        </div>
        <div className="text-xs text-card-foreground/70 text-center">
          {t("weatherDataBy")}{" "}
          <a
            dir="ltr"
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors hover:text-primary"
          >
            Open-Meteo.com
          </a>{" "}
          {t("and")}{" "}
          <a
            dir="ltr"
            href="https://www.windguru.cz/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors hover:text-primary"
          >
            Windguru
          </a>
        </div>
      </div>
    </footer>
  );
}
