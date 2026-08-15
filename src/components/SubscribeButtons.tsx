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
import { useTranslation } from "react-i18next";

interface SubscribeButtonsProps {
  config: CalendarConfig;
}

export function SubscribeButtons({ config }: SubscribeButtonsProps) {
  const { t } = useTranslation();
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
      timeoutRef.current = window.setTimeout(() => setCopyState("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setCopyState("error");
      timeoutRef.current = window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  function handleDownloadIcs() {
    const a = document.createElement("a");
    a.href = httpUrl;
    a.download = `wind-calendar-${config.locations.join("-")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const copyIconColor = {
    idle: "text-primary",
    success: "text-green-400",
    error: "text-red-400",
  }[copyState];

  const copyText = {
    idle: t("copyUrl"),
    success: t("copied"),
    error: t("copyFailed"),
  }[copyState];

  return (
    <section className="night-section">
      <div className="content-wrap">
        <h2 className="sticker-heading">{t("syncCalendar")}</h2>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <a href={webcalUrl} className="action-card flex items-center gap-3 p-4">
              <img
                alt=""
                src="/macos-calendar_logo.png"
                className="size-6 shrink-0 object-contain"
              />
              <strong dir="ltr" className="text-base font-bold text-card-foreground">
                {t("appleCalendar")}
              </strong>
            </a>

            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="action-card flex items-center gap-3 p-4"
            >
              <img
                alt=""
                src="/google_calendar_logo.svg"
                className="size-6 shrink-0 object-contain"
              />
              <strong dir="ltr" className="text-base font-bold text-card-foreground">
                {t("googleCalendar")}
              </strong>
            </a>

            <a
              href={outlookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="action-card flex items-center gap-3 p-4"
            >
              <img
                alt=""
                src="/outlook-calendar_logo.svg"
                className="size-6 shrink-0 object-contain"
              />
              <strong dir="ltr" className="text-base font-bold text-card-foreground">
                {t("outlook")}
              </strong>
            </a>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="action-card flex w-full items-center gap-3 p-4 text-start"
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
              className="action-card flex w-full items-center gap-3 p-4 text-start"
            >
              <Download className="size-6 shrink-0 text-primary" />
              <strong className="text-base font-bold text-card-foreground">
                {t("downloadIcs")} <bdi dir="ltr">.ics</bdi>
              </strong>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
