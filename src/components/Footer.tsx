import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#0B1220] border-t border-[#1F2937] py-6 px-5">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center text-sm text-slate-500 mb-3">
          <span>Wind Calendar</span>
          <a
            href="https://github.com/or-yam/wind-calendar"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 transition-colors"
            aria-label="GitHub repository"
          >
            <Github size={18} />
          </a>
        </div>
        <div className="text-xs text-slate-600 text-center">
          Weather data by{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-400 transition-colors"
          >
            Open-Meteo.com
          </a>{" "}
          and Windguru
        </div>
      </div>
    </footer>
  );
}
