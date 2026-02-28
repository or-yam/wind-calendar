import type { IcsEvent } from "../lib/ics-parser";
import { formatTime } from "../lib/date-utils";

interface EventTooltipProps {
  event: IcsEvent | null;
  x: number;
  y: number;
}

export function EventTooltip({ event, x, y }: EventTooltipProps) {
  if (!event) return null;

  const timeStr = `${formatTime(event.dtstart.hour, event.dtstart.minute)} – ${formatTime(
    event.dtend?.hour ?? event.dtstart.hour,
    event.dtend?.minute ?? event.dtstart.minute,
  )}`;

  // Position near cursor, keep on screen
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x + 14;
  let top = y + 14;

  // Simple heuristic to avoid overflow (actual measurement happens in CSS)
  if (left + 320 > vw - 8) left = x - 320 - 14;
  if (top + 200 > vh - 8) top = vh - 200 - 8;
  if (left < 8) left = 8;
  if (top < 8) top = 8;

  return (
    <div className="tooltip visible" style={{ left: `${left}px`, top: `${top}px` }}>
      <div className="tooltip-title">{event.summary}</div>
      <div className="tooltip-time">{timeStr}</div>
      <div className="tooltip-desc">{event.description || "(no details)"}</div>
    </div>
  );
}
