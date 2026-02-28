import { useState, useEffect, useMemo } from "react";
import { CalendarPreview } from "./components/CalendarPreview";
import { WeekNav } from "./components/WeekNav";
import { EventTooltip } from "./components/EventTooltip";
import { ConfigForm } from "./components/ConfigForm";
import { useCalendarFeed } from "./hooks/useCalendarFeed";
import { useWeekNavigation } from "./hooks/useWeekNavigation";
import { buildApiUrl, type CalendarConfig } from "./lib/subscribe-urls";
import type { IcsEvent } from "./lib/ics-parser";
import "./styles/calendar.css";

const DEFAULTS: CalendarConfig = {
  location: "beit-yanai",
  windMin: 14,
  windMax: 35,
  minSessionHours: 2,
};

function parseUrlParams(): CalendarConfig {
  const params = new URLSearchParams(window.location.search);
  return {
    location: params.get("location") || DEFAULTS.location,
    windMin: Number(params.get("windMin")) || DEFAULTS.windMin,
    windMax: Number(params.get("windMax")) || DEFAULTS.windMax,
    minSessionHours: Number(params.get("minSessionHours")) || DEFAULTS.minSessionHours,
  };
}

function App() {
  const [config, setConfig] = useState<CalendarConfig>(() => parseUrlParams());
  const [debouncedConfig, setDebouncedConfig] = useState<CalendarConfig>(config);

  // Sync URL params when config changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedConfig(config);

      // Update URL without navigation
      const params = new URLSearchParams({
        location: config.location,
        windMin: config.windMin.toString(),
        windMax: config.windMax.toString(),
        minSessionHours: config.minSessionHours.toString(),
      });
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }, 300);

    return () => clearTimeout(timer);
  }, [config]);

  // Build calendar URL from debounced config
  const calendarUrl = useMemo(() => buildApiUrl(debouncedConfig), [debouncedConfig]);

  const { events, loading, error } = useCalendarFeed(calendarUrl);
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
      <ConfigForm
        location={config.location}
        windMin={config.windMin}
        windMax={config.windMax}
        minSessionHours={config.minSessionHours}
        onLocationChange={(location) => setConfig({ ...config, location })}
        onWindMinChange={(windMin) => setConfig({ ...config, windMin })}
        onWindMaxChange={(windMax) => setConfig({ ...config, windMax })}
        onMinSessionHoursChange={(minSessionHours) => setConfig({ ...config, minSessionHours })}
      />

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
