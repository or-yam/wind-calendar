import { type IcsEvent } from "../lib/ics-parser";
import { addDays, getDayNames, sameDay, isToday, formatTime } from "../lib/date-utils";

const HOUR_START = 6;
const HOUR_END = 20;
const HOUR_HEIGHT = 48;

interface CalendarPreviewProps {
  weekStart: Date;
  events: IcsEvent[];
  weekStartsOnSunday: boolean;
  onEventHover: (event: IcsEvent, x: number, y: number) => void;
  onEventLeave: () => void;
}

function getEventStartHour(ev: IcsEvent): number {
  return ev.dtstart.hour + ev.dtstart.minute / 60;
}

function getEventEndHour(ev: IcsEvent): number {
  if (ev.dtend) {
    return ev.dtend.hour + ev.dtend.minute / 60;
  }
  return getEventStartHour(ev) + 1; // fallback: 1 hour
}

function getEventDate(ev: IcsEvent): Date {
  return ev.dtstart.date;
}

export function CalendarPreview({
  weekStart,
  events,
  weekStartsOnSunday,
  onEventHover,
  onEventLeave,
}: CalendarPreviewProps) {
  const totalHours = HOUR_END - HOUR_START;
  const dayNames = getDayNames(weekStartsOnSunday);

  // Generate hour labels
  const hourLabels = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    hourLabels.push(`${pad(h)}:00`);
  }

  // Generate day columns
  const dayColumns = [];
  for (let d = 0; d < 7; d++) {
    const dayDate = addDays(weekStart, d);
    const isTodayCol = isToday(dayDate);

    // Find events for this day
    const dayEvents = events.filter((ev) => sameDay(getEventDate(ev), dayDate));

    dayColumns.push({
      date: dayDate,
      name: dayNames[d],
      isToday: isTodayCol,
      events: dayEvents,
    });
  }

  return (
    <div className="calendar-body">
      {/* Time gutter */}
      <div className="time-gutter">
        <div className="time-gutter-header" />
        {hourLabels.map((label, i) => (
          <div key={i} className="time-label">
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Days area */}
      <div className="days-area">
        {dayColumns.map((col, idx) => (
          <div key={idx} className={`day-col ${col.isToday ? "today-col" : ""}`}>
            {/* Day header */}
            <div className="day-header">
              <div className="day-name">{col.name}</div>
              <div className="day-number">{col.date.getDate()}</div>
            </div>

            {/* Slots container */}
            <div className="day-slots">
              {/* Hour slots (grid lines) */}
              {Array.from({ length: totalHours }).map((_, i) => (
                <div key={i} className="hour-slot" />
              ))}

              {/* Event blocks */}
              {col.events.map((ev, evi) => {
                const startH = getEventStartHour(ev);
                const endH = getEventEndHour(ev);

                // Clamp to visible hour range
                const visStart = Math.max(startH, HOUR_START);
                const visEnd = Math.min(endH, HOUR_END);
                if (visStart >= visEnd) return null;

                const topPx = (visStart - HOUR_START) * HOUR_HEIGHT;
                const heightPx = (visEnd - visStart) * HOUR_HEIGHT - 2; // 2px gap

                const timeStr = `${formatTime(ev.dtstart.hour, ev.dtstart.minute)}–${formatTime(
                  ev.dtend?.hour ?? ev.dtstart.hour,
                  ev.dtend?.minute ?? ev.dtstart.minute
                )}`;

                return (
                  <div
                    key={evi}
                    className="event-block"
                    style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                    onMouseEnter={(e) => onEventHover(ev, e.clientX, e.clientY)}
                    onMouseMove={(e) => onEventHover(ev, e.clientX, e.clientY)}
                    onMouseLeave={onEventLeave}
                  >
                    {heightPx >= 34 && <div className="event-time">{timeStr}</div>}
                    <div className="event-summary">{ev.summary}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
