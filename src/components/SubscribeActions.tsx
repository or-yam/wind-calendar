import { useEffect, useRef, useState } from "react";
import { Copy, Download } from "lucide-react";
import {
  buildFullUrl,
  buildGoogleCalendarUrl,
  buildOutlookUrl,
  buildWebcalUrl,
} from "../lib/subscribe-urls";
import { cn } from "../lib/utils";
import type { CalendarConfig } from "@shared/types";

interface SubscribeActionsProps {
  config: CalendarConfig;
}

const actionClass =
  "grid size-[44px] shrink-0 cursor-pointer place-items-center rounded-sm border-0 bg-transparent p-0 text-[#04090b] hover:text-[#ff3d8d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff3d8d]";

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
    <div className="flex min-w-0 flex-col items-center gap-1">
      <div
        className="flex flex-wrap items-center justify-center gap-1 min-[380px]:gap-2"
        role="group"
        aria-label="Calendar actions"
      >
        {providers(config).map(({ label, url, icon, external }) => (
          <a
            key={label}
            href={url}
            aria-label={label}
            title={label}
            className={actionClass}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <img src={icon} alt="" className="size-[24px] object-contain" />
          </a>
        ))}

        <button
          type="button"
          aria-label="Copy subscription URL"
          title="Copy subscription URL"
          onClick={handleCopyUrl}
          className={actionClass}
        >
          <Copy size={24} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Download .ics"
          title="Download .ics"
          onClick={handleDownloadIcs}
          className={actionClass}
        >
          <Download size={24} aria-hidden="true" />
        </button>
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
