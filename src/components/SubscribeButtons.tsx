import { useState } from "react";
import { Copy, Download } from "lucide-react";
import {
  buildFullUrl,
  buildWebcalUrl,
  buildGoogleCalendarUrl,
  buildOutlookUrl,
  type CalendarConfig,
} from "../lib/subscribe-urls";

interface SubscribeButtonsProps {
  config: CalendarConfig;
}

export function SubscribeButtons({ config }: SubscribeButtonsProps) {
  const [copied, setCopied] = useState(false);

  const webcalUrl = buildWebcalUrl(config);
  const googleUrl = buildGoogleCalendarUrl(config);
  const outlookUrl = buildOutlookUrl(config);
  const httpUrl = buildFullUrl(config);

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(httpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
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

  return (
    <section className="py-12 px-5 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-slate-200 mb-6">Subscribe to Calendar</h2>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <a href={webcalUrl} className="block h-full">
            <div className="h-full bg-[#111827] border border-[#1F2937] hover:border-sky-500 transition-all rounded-lg p-4 cursor-pointer flex items-center gap-3">
              <img
                alt="mac-os calendar logo"
                src="/macos-calendar_logo.png"
                className="w-5 h-5 object-contain shrink-0"
              />
              <strong className="font-semibold text-sm text-slate-200">Apple Calendar</strong>
            </div>
          </a>

          <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
            <div className="h-full bg-[#111827] border border-[#1F2937] hover:border-sky-500 transition-all rounded-lg p-4 cursor-pointer flex items-center gap-3">
              <img
                alt="google calendar logo"
                src="/google_calendar_logo.svg"
                className="w-5 h-5 object-contain shrink-0"
              />
              <strong className="font-semibold text-sm text-slate-200">Google Calendar</strong>
            </div>
          </a>

          <a href={outlookUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
            <div className="h-full bg-[#111827] border border-[#1F2937] hover:border-sky-500 transition-all rounded-lg p-4 cursor-pointer flex items-center gap-3">
              <img
                alt="Microsoft outlook calendar logo"
                src="/outlook-calendar_logo.svg"
                className="w-5 h-5 object-contain shrink-0"
              />
              <strong className="font-semibold text-sm text-slate-200">Outlook</strong>
            </div>
          </a>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={handleCopyUrl} className="w-full h-full text-left">
            <div className="h-full bg-[#111827] border border-[#1F2937] hover:border-sky-500 transition-all rounded-lg p-4 cursor-pointer flex items-center gap-3">
              <Copy className="text-sky-400 w-5 h-5 shrink-0" />
              <strong className="font-semibold text-sm text-slate-200">
                {copied ? "Copied!" : "Copy URL"}
              </strong>
            </div>
          </button>

          <button type="button" onClick={handleDownloadIcs} className="w-full h-full text-left">
            <div className="h-full bg-[#111827] border border-[#1F2937] hover:border-sky-500 transition-all rounded-lg p-4 cursor-pointer flex items-center gap-3">
              <Download className="text-sky-400 w-5 h-5 shrink-0" />
              <strong className="font-semibold text-sm text-slate-200">Download .ics</strong>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
