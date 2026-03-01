import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#0B1220] border-t border-[#1F2937] py-6 px-5">
      <div className="max-w-2xl mx-auto flex justify-between items-center text-sm text-slate-500">
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
    </footer>
  );
}
