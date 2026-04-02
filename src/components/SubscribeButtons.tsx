import { useState, useEffect, useRef } from "react";
import { Copy, Download } from "lucide-react";
import {
  buildFullUrl,
  buildWebcalUrl,
  buildGoogleCalendarUrl,
  buildOutlookUrl,
} from "../lib/subscribe-urls";
import { cn } from "../lib/utils";
import type { CalendarConfig } from "@shared/types";

interface SubscribeButtonsProps {
  config: CalendarConfig;
}

export function SubscribeButtons({ config }: SubscribeButtonsProps) {
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const timeoutRef = useRef<number | undefined>(undefined);

  const webcalUrl = buildWebcalUrl(config);
  const googleUrl = buildGoogleCalendarUrl(config);
  const outlookUrl = buildOutlookUrl(config);
  const httpUrl = buildFullUrl(config);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopyUrl() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    try {
      await navigator.clipboard.writeText(httpUrl);
      setCopyState("success");
      timeoutRef.current = setTimeout(() => setCopyState("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setCopyState("error");
      timeoutRef.current = setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  function handleDownloadIcs() {
    const a = document.createElement("a");
    a.href = httpUrl;
    a.download = `wind-calendar-${config.location}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const copyIconColor = {
    idle: "text-primary",
    success: "text-success",
    error: "text-destructive",
  }[copyState];

  const copyText = {
    idle: "Copy URL",
    success: "Copied",
    error: "Copy failed",
  }[copyState];

  return (
    <section className="py-12 px-5 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Subscribe to Calendar</h2>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href={webcalUrl} className="block">
            <div className="bg-card border border-border hover:border-primary transition-colors rounded-lg p-4 flex items-center gap-3">
              <img
                alt="macOS Calendar logo"
                src="/macos-calendar_logo.png"
                className="w-5 h-5 object-contain shrink-0"
              />
              <strong className="font-semibold text-sm text-foreground">Apple Calendar</strong>
            </div>
          </a>

          <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="block">
            <div className="bg-card border border-border hover:border-primary transition-colors rounded-lg p-4 flex items-center gap-3">
              <img
                alt="google calendar logo"
                src="/google_calendar_logo.svg"
                className="w-5 h-5 object-contain shrink-0"
              />
              <strong className="font-semibold text-sm text-foreground">Google Calendar</strong>
            </div>
          </a>

          <a href={outlookUrl} target="_blank" rel="noopener noreferrer" className="block">
            <div className="bg-card border border-border hover:border-primary transition-colors rounded-lg p-4 flex items-center gap-3">
              <img
                alt="Microsoft Outlook calendar logo"
                src="/outlook-calendar_logo.svg"
                className="w-5 h-5 object-contain shrink-0"
              />
              <strong className="font-semibold text-sm text-foreground">Outlook</strong>
            </div>
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button type="button" onClick={handleCopyUrl} className="w-full text-left">
            <div className="bg-card border border-border hover:border-primary transition-colors rounded-lg p-4 flex items-center gap-3">
              <Copy className={cn("w-5 h-5 shrink-0", copyIconColor)} />
              <strong className="font-semibold text-sm text-foreground">{copyText}</strong>
              <span className="sr-only" role="status" aria-live="polite">
                {copyState !== "idle" && copyText}
              </span>
            </div>
          </button>

          <button type="button" onClick={handleDownloadIcs} className="w-full text-left">
            <div className="bg-card border border-border hover:border-primary transition-colors rounded-lg p-4 flex items-center gap-3">
              <Download className="text-primary w-5 h-5 shrink-0" />
              <strong className="font-semibold text-sm text-foreground">Download .ics</strong>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
