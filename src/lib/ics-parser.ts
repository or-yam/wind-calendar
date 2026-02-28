// ICS parser types and functions

export interface IcsDateTime {
  date: Date;
  tzid: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface IcsEvent {
  summary: string;
  description: string;
  dtstart: IcsDateTime;
  dtend: IcsDateTime | null;
}

/**
 * Unfold continuation lines per RFC 5545
 * Lines starting with space or tab are continuations of the previous line
 */
function unfoldLines(raw: string): string {
  return raw
    .replace(/\r\n[ \t]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

/**
 * Parse ICS datetime value (e.g., "20260222T070000" or "20260222T070000Z")
 * params may contain TZID=Asia/Jerusalem
 */
function parseIcsDateTime(value: string, params?: string): IcsDateTime | null {
  let tzid: string | null = null;
  if (params) {
    const tzMatch = params.match(/TZID=([^;:]+)/);
    if (tzMatch) tzid = tzMatch[1];
  }

  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;

  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const hour = parseInt(m[4], 10);
  const minute = parseInt(m[5], 10);
  const second = parseInt(m[6], 10);
  const isUtc = m[7] === "Z";

  if (isUtc) {
    return {
      date: new Date(Date.UTC(year, month, day, hour, minute, second)),
      tzid: "UTC",
      year,
      month,
      day,
      hour,
      minute,
      second,
    };
  }

  // For local times (with or without TZID), treat as local browser time for display.
  // Store raw components for reliable hour extraction in grid positioning.
  return {
    date: new Date(year, month, day, hour, minute, second),
    tzid: tzid || "local",
    year,
    month,
    day,
    hour,
    minute,
    second,
  };
}

/**
 * Unescape ICS text per RFC 5545
 */
function unescapeIcsText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Parse ICS calendar text into array of events
 */
export function parseIcs(raw: string): IcsEvent[] {
  const text = unfoldLines(raw);
  const lines = text.split("\n");
  const parsedEvents: IcsEvent[] = [];
  let inEvent = false;
  let current: Partial<IcsEvent> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = { summary: "", description: "", dtstart: undefined, dtend: null };
      continue;
    }

    if (line === "END:VEVENT") {
      if (current?.dtstart) {
        parsedEvents.push(current as IcsEvent);
      }
      inEvent = false;
      current = null;
      continue;
    }

    if (!inEvent || !current) continue;

    // Parse property line: NAME;PARAMS:VALUE
    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;

    const propPart = line.substring(0, colonIdx);
    const valuePart = line.substring(colonIdx + 1);

    const semiIdx = propPart.indexOf(";");
    const propName = semiIdx >= 0 ? propPart.substring(0, semiIdx) : propPart;
    const propParams = semiIdx >= 0 ? propPart.substring(semiIdx + 1) : "";

    switch (propName) {
      case "SUMMARY":
        current.summary = unescapeIcsText(valuePart);
        break;
      case "DESCRIPTION":
        current.description = unescapeIcsText(valuePart);
        break;
      case "DTSTART":
        current.dtstart = parseIcsDateTime(valuePart, propParams) ?? undefined;
        break;
      case "DTEND":
        current.dtend = parseIcsDateTime(valuePart, propParams);
        break;
    }
  }

  return parsedEvents;
}
