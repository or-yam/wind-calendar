import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";

const Analytics = lazy(() =>
  import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })),
);
import { ErrorBoundary } from "react-error-boundary";
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
import { LOCATIONS } from "@shared/locations";

function parseNumParam(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

function parseModelParam(params: URLSearchParams, fallback: number | string): number | string {
  const raw = params.get("model");
  if (raw === null) return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : raw; // Return string if not a number
}

function parseBoolParam(params: URLSearchParams, key: string, fallback: boolean): boolean {
  const raw = params.get(key);
  if (raw === null) return fallback;
  return raw === "true";
}

function parseUrlParams(): CalendarConfig {
  const params = new URLSearchParams(window.location.search);
  const waveSource = params.get("waveSource");
  return {
    location: params.get("location") || "beit-yanai",
    minSessionHours: parseNumParam(params, "minSessionHours", DEFAULTS.minSessionHours),
    model: parseModelParam(params, DEFAULTS.model),
    windEnabled: parseBoolParam(params, "windEnabled", DEFAULTS.windEnabled),
    windMin: parseNumParam(params, "windMin", DEFAULTS.windMin),
    windMax: parseNumParam(params, "windMax", DEFAULTS.windMax),
    waveEnabled: parseBoolParam(params, "waveEnabled", DEFAULTS.waveEnabled),
    waveSource: waveSource === "swell" ? "swell" : "total",
    waveHeightMin: parseNumParam(params, "waveHeightMin", DEFAULTS.waveHeightMin),
    waveHeightMax: parseNumParam(params, "waveHeightMax", DEFAULTS.waveHeightMax),
    wavePeriodMin: parseNumParam(params, "wavePeriodMin", DEFAULTS.wavePeriodMin),
  };
}

function App() {
  const [config, setConfig] = useState<CalendarConfig>(() => parseUrlParams());
  const [debouncedConfig, setDebouncedConfig] = useState<CalendarConfig>(config);

  // Sync URL params when config changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedConfig(config);

      // Update URL without navigation — only include non-default values
      const params = new URLSearchParams({
        location: config.location,
        model: config.model.toString(),
        minSessionHours: config.minSessionHours.toString(),
        windEnabled: config.windEnabled.toString(),
        windMin: config.windMin.toString(),
        windMax: config.windMax.toString(),
        waveEnabled: config.waveEnabled.toString(),
        ...(config.waveEnabled && {
          waveSource: config.waveSource,
          waveHeightMin: config.waveHeightMin.toString(),
          waveHeightMax: config.waveHeightMax.toString(),
          wavePeriodMin: config.wavePeriodMin.toString(),
        }),
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

  // Track if we've already navigated to first event for this calendar config
  const hasNavigatedRef = useRef(false);

  // Reset navigation tracking when calendar URL changes (new config)
  useEffect(() => {
    hasNavigatedRef.current = false;
  }, [calendarUrl]);

  // Go to first event only once when events first load
  useEffect(() => {
    if (events.length > 0 && !hasNavigatedRef.current) {
      goToFirstEvent();
      hasNavigatedRef.current = true;
    }
  }, [events.length, goToFirstEvent]);

  // Handler for location change - check if model is available in new location
  const handleLocationChange = (location: string) => {
    const newLocation = LOCATIONS[location as keyof typeof LOCATIONS];
    const newModel =
      typeof config.model === "number" &&
      (newLocation.models as readonly number[]).includes(config.model)
        ? config.model
        : DEFAULTS.model;

    setConfig((c) => ({ ...c, location, model: newModel }));
  };

  // Handler for model change
  const handleModelChange = (model: number | string) => {
    setConfig((c) => ({ ...c, model }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-slate-200">
      <Hero
        location={config.location}
        model={config.model}
        availableModels={LOCATIONS[config.location as keyof typeof LOCATIONS].models}
        windEnabled={config.windEnabled}
        windMin={config.windMin}
        windMax={config.windMax}
        waveEnabled={config.waveEnabled}
        waveSource={config.waveSource}
        waveHeightMin={config.waveHeightMin}
        waveHeightMax={config.waveHeightMax}
        wavePeriodMin={config.wavePeriodMin}
        minSessionHours={config.minSessionHours}
        onLocationChange={handleLocationChange}
        onModelChange={handleModelChange}
        onWindEnabledChange={(windEnabled) => setConfig((c) => ({ ...c, windEnabled }))}
        onWindMinChange={(windMin) => setConfig((c) => ({ ...c, windMin }))}
        onWindMaxChange={(windMax) => setConfig((c) => ({ ...c, windMax }))}
        onWaveEnabledChange={(waveEnabled) => setConfig((c) => ({ ...c, waveEnabled }))}
        onWaveSourceChange={(waveSource) => setConfig((c) => ({ ...c, waveSource }))}
        onWaveHeightMinChange={(waveHeightMin) => setConfig((c) => ({ ...c, waveHeightMin }))}
        onWaveHeightMaxChange={(waveHeightMax) => setConfig((c) => ({ ...c, waveHeightMax }))}
        onWavePeriodMinChange={(wavePeriodMin) => setConfig((c) => ({ ...c, wavePeriodMin }))}
        onMinSessionHoursChange={(minSessionHours) => setConfig((c) => ({ ...c, minSessionHours }))}
      />
      <ErrorBoundary
        fallback={
          <div className="py-12 px-5 text-center">
            <p className="text-red-400 text-sm">
              Something went wrong. Please try refreshing the page.
            </p>
          </div>
        }
      >
        <SubscribeButtons config={debouncedConfig} />
      </ErrorBoundary>
      <ErrorBoundary
        fallback={
          <div className="py-12 px-5 text-center">
            <p className="text-red-400 text-sm">
              Something went wrong. Please try refreshing the page.
            </p>
          </div>
        }
      >
        <ForecastCards
          events={events}
          loading={loading}
          error={error}
          weekStart={weekStart}
          onPrev={goToPrev}
          onNext={goToNext}
          onToday={goToToday}
        />
      </ErrorBoundary>
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
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
    </div>
  );
}

export default App;
