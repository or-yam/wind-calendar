import { useId, useRef, useState } from "react";
import type { ForecastSession } from "@shared/forecast-types";
import { addDays } from "@/lib/date-utils";
import { DayColumn } from "./DayColumn";
import { HourScale } from "./HourScale";
import { SessionDetails } from "./SessionDetails";
import { intersects, weekHours } from "./sessionSegments";
import { sessionKey } from "./overlapLanes";
import { useMobileCalendar } from "@/hooks/useMobileCalendar";

const DESKTOP_HOUR_HEIGHT = 36;
const MOBILE_HOUR_HEIGHT = 40;

export function CalendarGrid({
  days,
  sessions,
  today,
  weekStart,
}: {
  days: Date[];
  sessions: ForecastSession[];
  today: Date;
  weekStart: Date;
}) {
  const isMobile = useMobileCalendar();
  const hourHeight = isMobile ? MOBILE_HOUR_HEIGHT : DESKTOP_HOUR_HEIGHT;
  const { startHour, endHour } = weekHours(sessions, weekStart);
  const detailsId = useId();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const selected = sessions.find(
    (session) =>
      sessionKey(session) === selectedKey &&
      days.some((day) => intersects(session, day, addDays(day, 1))),
  );
  if (selectedKey !== null && !selected) setSelectedKey(null);
  const close = () => {
    setSelectedKey(null);
    if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
  };
  return (
    <>
      <div
        role="region"
        aria-label="Weekly forecast calendar"
        className="grid overflow-hidden rounded border border-border bg-card"
        style={{ gridTemplateColumns: `40px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <HourScale startHour={startHour} endHour={endHour} hourHeight={hourHeight} />
        {days.map((day) => (
          <DayColumn
            key={day.toDateString()}
            day={day}
            sessions={sessions}
            today={today}
            startHour={startHour}
            endHour={endHour}
            hourHeight={hourHeight}
            selectedKey={selectedKey}
            detailsId={detailsId}
            onActivate={(session, button) => {
              trigger.current = button;
              setSelectedKey(sessionKey(session));
            }}
          />
        ))}
      </div>
      {selected && <SessionDetails session={selected} id={detailsId} onClose={close} />}
    </>
  );
}
