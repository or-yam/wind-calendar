import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { forecastQueryOptions } from "./lib/forecast-query";

const Analytics = lazy(() =>
  import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })),
);
import { ErrorBoundary } from "react-error-boundary";
import { Hero } from "./components/Hero";
import { ForecastCards } from "./components/ForecastCards";
import { SubscribeButtons } from "./components/SubscribeButtons";
import { Caveats } from "./components/Caveats";
import { Footer } from "./components/Footer";
import { useWeekNavigation } from "./hooks/useWeekNavigation";
import type { CalendarConfig } from "@shared/types";
import { DEFAULTS } from "@shared/constants";
import { LOCATIONS } from "@shared/locations";
import { buildConfigParams } from "./lib/subscribe-urls";

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

const VALID_LOCATIONS = new Set(Object.keys(LOCATIONS));

function getAvailableModels(locations: string[]): number[] {
  const modelLists = locations.map(
    (location) => LOCATIONS[location as keyof typeof LOCATIONS].models as readonly number[],
  );
  return [...modelLists[0]].filter((model) => modelLists.every((models) => models.includes(model)));
}

function parseUrlParams(): CalendarConfig {
  const params = new URLSearchParams(window.location.search);
  const rawLocations = (params.get("locations") ?? params.get("location") ?? "")
    .split(",")
    .map((location) => location.trim())
    .filter((location) => VALID_LOCATIONS.has(location));
  const locations = [...new Set(rawLocations)].slice(0, 3);
  const waveSource = params.get("waveSource");
  return {
    locations: locations.length > 0 ? locations : [...DEFAULTS.locations],
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

  useEffect(() => {
    const params = buildConfigParams(config);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [config]);

  useEffect(() => {
    const handler = () => setConfig(parseUrlParams());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const { data, isPending, error } = useQuery(forecastQueryOptions(config));
  const sessions = data?.sessions ?? [];
  const forecastConfigKey = buildConfigParams(config).toString();
  const { weekStart, goToToday, goToPrev, goToNext } = useWeekNavigation(
    sessions,
    forecastConfigKey,
  );

  const handleLocationsChange = (locations: string[]) => {
    if (
      locations.length < 1 ||
      locations.length > 3 ||
      locations.some((location) => !VALID_LOCATIONS.has(location))
    )
      return;
    const availableModels = getAvailableModels(locations);
    const newModel =
      typeof config.model === "string" || availableModels.includes(config.model)
        ? config.model
        : DEFAULTS.model;

    setConfig((c) => ({ ...c, locations, model: newModel }));
  };

  const availableModels = getAvailableModels(config.locations);

  // Handler for model change
  const handleModelChange = (model: number | string) => {
    setConfig((c) => ({ ...c, model }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Hero
        locations={config.locations}
        model={config.model}
        availableModels={availableModels}
        windEnabled={config.windEnabled}
        windMin={config.windMin}
        windMax={config.windMax}
        waveEnabled={config.waveEnabled}
        waveSource={config.waveSource}
        waveHeightMin={config.waveHeightMin}
        waveHeightMax={config.waveHeightMax}
        wavePeriodMin={config.wavePeriodMin}
        minSessionHours={config.minSessionHours}
        onLocationsChange={handleLocationsChange}
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
      <main>
        <SubscribeButtons config={config} />
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
            sessions={sessions}
            isPending={isPending}
            error={error}
            weekStart={weekStart}
            onPrev={goToPrev}
            onNext={goToNext}
            onToday={goToToday}
          />
        </ErrorBoundary>
        <section className="py-12 px-5">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-foreground font-semibold text-lg mb-3">About</h2>
            <p className="text-foreground/80 text-sm leading-relaxed">
              Wind Calendar exists to give surfers a rough sense of when conditions might be worth
              checking, not to replace a proper forecast. The idea is simple: sync a wind-filtered
              view into your regular calendar so promising days are visible alongside everything
              else in your life.
            </p>
          </div>
        </section>
        <Caveats />
      </main>
      <Footer />
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
    </div>
  );
}

export default App;
