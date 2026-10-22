import { useEffect, useRef, useState } from "react";
import { Copy, Download } from "lucide-react";
import {
  buildFullUrl,
  buildGoogleCalendarUrl,
  buildOutlookUrl,
  buildWebcalUrl,
} from "../lib/subscribe-urls";
import { cn } from "../lib/utils";
import { buttonVariants } from "./ui/button";
import type { CalendarConfig } from "@shared/types";

interface SubscribeActionsProps {
  config: CalendarConfig;
}

const providers = (config: CalendarConfig) => [
  {
    label: "Apple Calendar",
    url: buildWebcalUrl(config),
    icon: "/macos-calendar_logo.png",
    external: false,
  },
  {
    label: "Google Calendar",
    url: buildGoogleCalendarUrl(config),
    icon: "/google_calendar_logo.svg",
    external: true,
  },
  {
    label: "Outlook",
    url: buildOutlookUrl(config),
    icon: "/outlook-calendar_logo.svg",
    external: true,
  },
];

export function SubscribeActions({ config }: SubscribeActionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const timeoutRef = useRef<number | undefined>(undefined);
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
      timeoutRef.current = window.setTimeout(() => setCopyState("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setCopyState("error");
      timeoutRef.current = window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  function handleDownloadIcs() {
    const link = document.createElement("a");
    link.href = httpUrl;
    link.download = `wind-calendar-${config.locations.join("-")}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const copyMessage = {
    idle: "",
    success: "Subscription URL copied",
    error: "Could not copy the subscription URL",
  }[copyState];

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-2">
      <div
        className="flex w-full flex-col items-center gap-3"
        role="group"
        aria-label="Calendar actions"
      >
        <div className="grid w-full grid-cols-3 gap-2">
          {providers(config).map(({ label, url, icon, external }) => (
            <a
              key={label}
              href={url}
              aria-label={label}
              title={label}
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "h-auto min-h-12 w-full min-w-0 rounded-sm border-2 border-foreground px-2 py-2 text-sm font-bold shadow-[2px_2px_0_var(--foreground)] max-[420px]:flex-col max-[420px]:gap-1 max-[420px]:whitespace-normal",
              )}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <img src={icon} alt="" className="size-[24px] shrink-0 object-contain" />
              <span className="truncate">{label.replace(" Calendar", "")}</span>
            </a>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 text-xs">
          <button
            type="button"
            aria-label="Copy subscription URL"
            title="Copy subscription URL"
            onClick={handleCopyUrl}
            className="min-h-9 text-foreground underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="inline-flex items-center gap-1">
              <Copy size={14} aria-hidden="true" />
              Copy link
            </span>
          </button>
          <button
            type="button"
            aria-label="Download .ics"
            title="Download .ics"
            onClick={handleDownloadIcs}
            className="min-h-9 text-foreground underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="inline-flex items-center gap-1">
              <Download size={14} aria-hidden="true" />
              Download .ics
            </span>
          </button>
        </div>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "min-h-4 text-xs font-semibold",
          copyState === "error" ? "text-red-700" : "text-[#0b6b4f]",
        )}
      >
        {copyMessage}
      </p>
    </div>
  );
}
