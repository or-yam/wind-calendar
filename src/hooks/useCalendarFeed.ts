import { useState, useEffect } from "react";
import { parseIcs, type IcsEvent } from "../lib/ics-parser";

interface UseCalendarFeedResult {
  events: IcsEvent[];
  loading: boolean;
  error: string | null;
}

export function useCalendarFeed(url: string): UseCalendarFeedResult {
  const [events, setEvents] = useState<IcsEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url.trim()) return;

    const abortController = new AbortController();

    async function fetchCalendar() {
      setLoading(true);
      setError(null);

      try {
        const resp = await fetch(url, { signal: abortController.signal });

        if (!resp.ok) {
          const body = await resp.text();
          let detail = `${resp.status} ${resp.statusText}`;
          if (body && body.length < 300) detail += `\n${body}`;
          throw new Error(`HTTP ${detail}`);
        }

        const text = await resp.text();

        if (!text.includes("BEGIN:VCALENDAR")) {
          throw new Error("Response is not a valid ICS feed. Expected VCALENDAR data.");
        }

        const parsedEvents = parseIcs(text);
        setEvents(parsedEvents);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled, ignore
          return;
        }
        let msg = "Unknown error";
        if (err instanceof Error) {
          msg = err.message || msg;
          if (err.name === "TypeError" && msg === "Failed to fetch") {
            msg =
              "Network error.\n\nThe server may be down or CORS is blocking the request. Make sure the dev server is running at the URL above.";
          }
        } else {
          msg = String(err);
        }
        setError(msg);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCalendar();

    return () => {
      abortController.abort();
    };
  }, [url]);

  return { events, loading, error };
}
