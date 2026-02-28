import { useState, useEffect } from "react";
import { CalendarPreview } from "./components/CalendarPreview";
import { WeekNav } from "./components/WeekNav";
import { EventTooltip } from "./components/EventTooltip";
import { useCalendarFeed } from "./hooks/useCalendarFeed";
import { useWeekNavigation } from "./hooks/useWeekNavigation";
import type { IcsEvent } from "./lib/ics-parser";
import "./styles/calendar.css";

const CALENDAR_URL = "/api/calendar";

function App() {
  const { events, loading, error } = useCalendarFeed(CALENDAR_URL);
  const {
    weekStart,
    weekStartsOnSunday,
    goToToday,
    goToPrev,
    goToNext,
    goToFirstEvent,
    toggleWeekStart,
  } = useWeekNavigation(events);

  const [tooltipEvent, setTooltipEvent] = useState<IcsEvent | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Go to first event when events load
  useEffect(() => {
    if (events.length > 0) {
      goToFirstEvent();
    }
  }, [events.length, goToFirstEvent]);

  function handleEventHover(event: IcsEvent, x: number, y: number) {
    setTooltipEvent(event);
    setTooltipPos({ x, y });
  }

  function handleEventLeave() {
    setTooltipEvent(null);
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <WeekNav
        weekStart={weekStart}
        weekStartsOnSunday={weekStartsOnSunday}
        onToday={goToToday}
        onPrev={goToPrev}
        onNext={goToNext}
        onToggleWeekStart={toggleWeekStart}
      />

      <div className="calendar-wrap">
        {/* Message overlay */}
        {(loading || error || events.length === 0) && (
          <div
            className={`message-overlay ${loading || error || events.length === 0 ? "visible" : ""}`}
          >
            <div className={`message-box ${error ? "error" : loading ? "loading" : "empty"}`}>
              {loading && (
                <>
                  <div className="spinner" />
                  <div className="message-text">Fetching calendar feed...</div>
                </>
              )}
              {error && <div className="message-text">{error}</div>}
              {!loading && !error && events.length === 0 && (
                <div className="message-text">No events found in this feed.</div>
              )}
            </div>
          </div>
        )}

        {/* Calendar grid */}
        <CalendarPreview
          weekStart={weekStart}
          events={events}
          weekStartsOnSunday={weekStartsOnSunday}
          onEventHover={handleEventHover}
          onEventLeave={handleEventLeave}
        />
      </div>

      {/* Tooltip */}
      <EventTooltip event={tooltipEvent} x={tooltipPos.x} y={tooltipPos.y} />
    </div>
  );
}

export default App;
