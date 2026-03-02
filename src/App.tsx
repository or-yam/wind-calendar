import { useState, useEffect, useMemo } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Hero } from "./components/Hero";
import { ForecastCards } from "./components/ForecastCards";
import { SubscribeButtons } from "./components/SubscribeButtons";
import { Caveats } from "./components/Caveats";
import { Footer } from "./components/Footer";
import { useCalendarFeed } from "./hooks/useCalendarFeed";
import { useWeekNavigation } from "./hooks/useWeekNavigation";
import { buildApiUrl } from "./lib/subscribe-urls";
import type { CalendarConfig } from "@shared/types";
import { DEFAULTS } from "@shared/constants";

function parseUrlParams(): CalendarConfig {
  const params = new URLSearchParams(window.location.search);
  return {
    location: params.get("location") || "beit-yanai",
    windMin: Number(params.get("windMin")) || DEFAULTS.windMin,
    windMax: Number(params.get("windMax")) || DEFAULTS.windMax,
    minSessionHours: Number(params.get("minSessionHours")) || DEFAULTS.minSessionHours,
    model: DEFAULTS.model,
    waveHeightMin: DEFAULTS.waveHeightMin,
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
  const { weekStart, goToToday, goToPrev, goToNext, goToFirstEvent } = useWeekNavigation(events);

  // Go to first event when events load
  useEffect(() => {
    if (events.length > 0) {
      goToFirstEvent();
    }
  }, [events.length, goToFirstEvent]);

  return (
    <div className="flex flex-col min-h-screen bg-background  text-slate-200">
      <Hero
        location={config.location}
        windMin={config.windMin}
        windMax={config.windMax}
        minSessionHours={config.minSessionHours}
        onLocationChange={(location) => setConfig((c) => ({ ...c, location }))}
        onWindMinChange={(windMin) => setConfig((c) => ({ ...c, windMin }))}
        onWindMaxChange={(windMax) => setConfig((c) => ({ ...c, windMax }))}
        onMinSessionHoursChange={(minSessionHours) => setConfig((c) => ({ ...c, minSessionHours }))}
      />
      <SubscribeButtons config={debouncedConfig} />
      <ForecastCards
        events={events}
        loading={loading}
        error={error}
        weekStart={weekStart}
        onPrev={goToPrev}
        onNext={goToNext}
        onToday={goToToday}
      />
      <section className="py-12 px-5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-slate-200 font-semibold text-lg mb-3">About</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Wind Calendar exists to give surfers a rough sense of when conditions might be worth
            checking, not to replace a proper forecast. The idea is simple: sync a wind-filtered
            view into your regular calendar so promising days are visible alongside everything else
            in your life.
          </p>
        </div>
      </section>
      <Caveats />
      <Footer />
      <Analytics />
    </div>
  );
}

export default App;
