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
import { captureApiError, captureEvent } from "../lib/analytics";

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
      captureEvent("url copied", {});
      setCopyState("success");
      timeoutRef.current = window.setTimeout(() => setCopyState("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setCopyState("error");
      timeoutRef.current = window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  async function handleDownloadIcs() {
    let response: Response;
    try {
      response = await fetch(httpUrl);
    } catch {
      captureApiError("calendar", 0, "network");
      return;
    }

    if (!response.ok) {
      captureApiError("calendar", response.status, "http");
      return;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("text/calendar")) {
      captureApiError("calendar", response.status, "invalid response");
      return;
    }

    try {
      const blob = await response.blob();
      if (!(await blob.text()).trimStart().startsWith("BEGIN:VCALENDAR")) {
        captureApiError("calendar", response.status, "invalid response");
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      try {
        a.href = objectUrl;
        a.download = `wind-calendar-${config.locations.join("-")}.ics`;
        document.body.appendChild(a);
        a.click();
      } finally {
        a.remove();
        URL.revokeObjectURL(objectUrl);
      }
      captureEvent("ics downloaded", {});
    } catch {
      captureApiError("calendar", response.status, "processing");
    }
  }

  const copyIconColor = {
    idle: "text-primary",
    success: "text-green-400",
    error: "text-red-400",
  }[copyState];

  const copyText = {
    idle: "Copy URL",
    success: "Copied!",
    error: "Copy failed",
  }[copyState];

  return (
    <section className="night-section">
      <div className="content-wrap">
        <h2 className="sticker-heading">Stick it somewhere</h2>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <a
              href={webcalUrl}
              onClick={() => captureEvent("subscription clicked", { provider: "apple" })}
              className="action-card flex items-center gap-3 p-4"
            >
              <img
                alt="macOS Calendar logo"
                src="/macos-calendar_logo.png"
                className="size-6 shrink-0 object-contain"
              />
              <strong className="text-base font-bold text-card-foreground">Apple Calendar</strong>
            </a>

            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => captureEvent("subscription clicked", { provider: "google" })}
              className="action-card flex items-center gap-3 p-4"
            >
              <img
                alt="google calendar logo"
                src="/google_calendar_logo.svg"
                className="size-6 shrink-0 object-contain"
              />
              <strong className="text-base font-bold text-card-foreground">Google Calendar</strong>
            </a>

            <a
              href={outlookUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => captureEvent("subscription clicked", { provider: "outlook" })}
              className="action-card flex items-center gap-3 p-4"
            >
              <img
                alt="Microsoft Outlook calendar logo"
                src="/outlook-calendar_logo.svg"
                className="size-6 shrink-0 object-contain"
              />
              <strong className="text-base font-bold text-card-foreground">Outlook</strong>
            </a>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="action-card flex w-full items-center gap-3 p-4 text-left"
            >
              <Copy className={cn("size-6 shrink-0", copyIconColor)} />
              <strong className="text-base font-bold text-card-foreground">{copyText}</strong>
              <span className="sr-only" role="status" aria-live="polite">
                {copyState !== "idle" && copyText}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadIcs}
              className="action-card flex w-full items-center gap-3 p-4 text-left"
            >
              <Download className="size-6 shrink-0 text-primary" />
              <strong className="text-base font-bold text-card-foreground">Download .ics</strong>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
