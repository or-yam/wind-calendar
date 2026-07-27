import { GithubIcon } from "@/components/icons/github";

export function Footer() {
  return (
    <footer className="bg-card border-t border-primary py-6 px-5">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center text-sm text-card-foreground mb-3">
          <span>Wind Calendar</span>
          <a
            href="https://github.com/or-yam/wind-calendar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-secondary transition-colors"
            aria-label="GitHub repository"
          >
            <GithubIcon size={18} />
          </a>
        </div>
        <div className="text-xs text-card-foreground/70 text-center">
          Weather data by{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary transition-colors"
          >
            Open-Meteo.com
          </a>
          and{" "}
          <a
            href="https://www.windguru.cz/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary transition-colors"
          >
            Windguru
          </a>
        </div>
      </div>
    </footer>
  );
}
