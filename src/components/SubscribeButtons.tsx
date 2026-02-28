import { useState } from "react";
import {
  buildFullUrl,
  buildWebcalUrl,
  buildGoogleCalendarUrl,
  type CalendarConfig,
} from "../lib/subscribe-urls";

interface SubscribeButtonsProps {
  config: CalendarConfig;
}

export function SubscribeButtons({ config }: SubscribeButtonsProps) {
  const [copied, setCopied] = useState(false);

  const webcalUrl = buildWebcalUrl(config);
  const googleUrl = buildGoogleCalendarUrl(config);
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
    // Create a hidden link and trigger download
    const a = document.createElement("a");
    a.href = httpUrl;
    a.download = `wind-calendar-${config.location}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="subscribe-section">
      <h2>Subscribe to Calendar</h2>

      <div className="subscribe-buttons">
        <a href={webcalUrl} className="subscribe-btn apple">
          <span className="btn-text">
            <strong>Apple Calendar</strong>
            <small>Auto-syncs ~15 min</small>
          </span>
        </a>

        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="subscribe-btn google"
        >
          <span className="btn-text">
            <strong>Google Calendar</strong>
            <small>Auto-syncs ~12-24 hours</small>
          </span>
        </a>

        <button type="button" onClick={handleCopyUrl} className="subscribe-btn copy">
          <span className="btn-text">
            <strong>{copied ? "Copied!" : "Copy URL"}</strong>
            <small>For Outlook (~12h sync)</small>
          </span>
        </button>

        <button type="button" onClick={handleDownloadIcs} className="subscribe-btn download">
          <span className="btn-text">
            <strong>Download .ics</strong>
            <small>One-time static copy</small>
          </span>
        </button>
      </div>

      <div className="subscribe-notes">
        <h3>Sync Frequency</h3>
        <ul>
          <li>
            <strong>Apple Calendar:</strong> ~15 minutes
          </li>
          <li>
            <strong>Google Calendar:</strong> ~12-24 hours (can't be changed)
          </li>
          <li>
            <strong>Outlook:</strong> ~12 hours
          </li>
          <li>
            <strong>Download .ics:</strong> No auto-sync (static snapshot)
          </li>
        </ul>
      </div>
    </div>
  );
}
