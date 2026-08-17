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
import { isValidModelId, type ModelId } from "@shared/models";
import { buildConfigParams } from "./lib/subscribe-urls";
import { calendarConfigSchema } from "@shared/calendar-config-schema";
import { featuresQueryOptions } from "./lib/features-query";
import { sendConfigFeedback } from "./lib/config-feedback";

function parseNumParam(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

function parseModelParam(params: URLSearchParams, fallback: ModelId): ModelId {
  const raw = params.get("model");
  if (raw === null) return fallback;
  const num = Number(raw);
  const model = Number.isFinite(num) ? num : raw;
  return isValidModelId(model) ? model : fallback;
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

function parseUrlParams() {
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

function parseValidatedUrlParams(): CalendarConfig {
  const parsed = calendarConfigSchema.safeParse(parseUrlParams());
  return parsed.success
    ? parsed.data
    : { ...DEFAULTS, locations: [...DEFAULTS.locations], model: DEFAULTS.model };
}

function App() {
  const [config, setConfig] = useState<CalendarConfig>(() => parseValidatedUrlParams());
  const [confirmedConfig, setConfirmedConfig] = useState<CalendarConfig>(() =>
    parseValidatedUrlParams(),
  );
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [feedbackToken, setFeedbackToken] = useState<string>();
  const { data: features } = useQuery(featuresQueryOptions);

  const updateConfig = (update: (current: CalendarConfig) => CalendarConfig) => {
    const nextConfig = update(config);
    setConfig(nextConfig);
    if (!confirmationPending) setConfirmedConfig(nextConfig);
  };

  useEffect(() => {
    const params = buildConfigParams(config);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [config]);

  useEffect(() => {
    const handler = () => {
      const nextConfig = parseValidatedUrlParams();
      setConfig(nextConfig);
      setConfirmedConfig(nextConfig);
      setConfirmationPending(false);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const { data, isPending, error } = useQuery(forecastQueryOptions(config));
  const sessions = data?.sessions ?? [];
  const forecastConfigKey = buildConfigParams(config).toString();
  const { weekStart, goToToday, goToPrev, goToNext } = useWeekNavigation(forecastConfigKey);

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

    updateConfig((c) => ({ ...c, locations, model: newModel }));
  };

  const availableModels = getAvailableModels(config.locations);

  // Handler for model change
  const handleModelChange = (model: ModelId) => {
    updateConfig((c) => ({ ...c, model }));
  };

  return (
    <div className="flex min-h-screen flex-col text-foreground">
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
        onWindEnabledChange={(windEnabled) => updateConfig((c) => ({ ...c, windEnabled }))}
        onWindMinChange={(windMin) => updateConfig((c) => ({ ...c, windMin }))}
        onWindMaxChange={(windMax) => updateConfig((c) => ({ ...c, windMax }))}
        onWaveEnabledChange={(waveEnabled) => updateConfig((c) => ({ ...c, waveEnabled }))}
        onWaveSourceChange={(waveSource) => updateConfig((c) => ({ ...c, waveSource }))}
        onWaveHeightMinChange={(waveHeightMin) => updateConfig((c) => ({ ...c, waveHeightMin }))}
        onWaveHeightMaxChange={(waveHeightMax) => updateConfig((c) => ({ ...c, waveHeightMax }))}
        onWavePeriodMinChange={(wavePeriodMin) => updateConfig((c) => ({ ...c, wavePeriodMin }))}
        onMinSessionHoursChange={(minSessionHours) =>
          updateConfig((c) => ({ ...c, minSessionHours }))
        }
        onFreeTextConfig={(nextConfig, _message, token) => {
          const validated = calendarConfigSchema.parse(nextConfig);
          setConfig(validated);
          setFeedbackToken(token);
          setConfirmationPending(true);
        }}
        freeTextConfigBuilderEnabled={features?.freeTextConfigBuilder ?? false}
      />
      <main>
        {confirmationPending && (
          <section className="night-section pb-0">
            <div className="content-wrap flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-bold">
                Review the extracted settings above before updating subscription links.
              </p>
              <button
                type="button"
                className="rounded-sm bg-primary px-5 py-3 font-bold text-primary-foreground"
                onClick={() => {
                  const validated = calendarConfigSchema.parse(config);
                  setConfirmedConfig(validated);
                  setConfirmationPending(false);
                  if (feedbackToken) {
                    void sendConfigFeedback(feedbackToken, validated);
                    setFeedbackToken(undefined);
                  }
                }}
              >
                Confirm configuration
              </button>
            </div>
          </section>
        )}
        <ErrorBoundary
          fallback={
            <div className="night-section px-5 text-center">
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
        <SubscribeButtons config={confirmedConfig} />
        <section className="night-section">
          <div className="content-wrap grid gap-6 md:grid-cols-[minmax(0,1fr)_2fr] md:items-start">
            <h2 className="sticker-heading mb-0">About</h2>
            <p className="max-w-2xl text-lg leading-relaxed text-foreground/80">
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
