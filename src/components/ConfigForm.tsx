import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODELS, isValidModelId, type ModelId } from "@shared/models";
import type { WaveSource } from "@shared/types";
import { LocationMultiSelect } from "./LocationMultiSelect";
import { WindRangeField } from "./WindRangeField";
import { MinSessionField } from "./MinSessionField";
import { ConditionRow } from "./ConditionRow";
import { useTranslation } from "react-i18next";
import type { Locale } from "@/i18n/locale";
import { localeMetadata } from "@/i18n/locale";
import { formatNumber } from "@/lib/date-utils";

export interface ConfigFormProps {
  locations: string[];
  model: ModelId;
  availableModels: number[];
  windEnabled: boolean;
  windMin: number;
  windMax: number;
  waveEnabled: boolean;
  waveSource: WaveSource;
  waveHeightMin: number;
  waveHeightMax: number;
  wavePeriodMin: number;
  minSessionHours: number;
  wavesForecastEnabled: boolean;
  windguruForecastModelsEnabled: boolean;
  onLocationsChange: (locations: string[]) => void;
  onModelChange: (model: ModelId) => void;
  onWindEnabledChange: (enabled: boolean) => void;
  onWindRangeChange: (range: [number, number]) => void;
  onWaveEnabledChange: (enabled: boolean) => void;
  onWaveSourceChange: (source: WaveSource) => void;
  onWaveHeightRangeChange: (range: [number, number]) => void;
  onWavePeriodMinChange: (value: number) => void;
  onMinSessionHoursChange: (value: number) => void;
}

export function ConfigForm({
  locations,
  model,
  availableModels,
  windEnabled,
  windMin,
  windMax,
  waveEnabled,
  waveSource,
  waveHeightMin,
  waveHeightMax,
  wavePeriodMin,
  minSessionHours,
  wavesForecastEnabled,
  windguruForecastModelsEnabled,
  onLocationsChange,
  onModelChange,
  onWindEnabledChange,
  onWindRangeChange,
  onWaveEnabledChange,
  onWaveSourceChange,
  onWaveHeightRangeChange,
  onWavePeriodMinChange,
  onMinSessionHoursChange,
}: ConfigFormProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const intlLocale = localeMetadata[locale].intl;
  const number = (value: number) => formatNumber(value, locale, { maximumFractionDigits: 1 });
  const [localWaveHeight, setLocalWaveHeight] = useState([waveHeightMin, waveHeightMax]);
  const [localWavePeriod, setLocalWavePeriod] = useState(wavePeriodMin);

  useEffect(() => {
    setLocalWaveHeight([waveHeightMin, waveHeightMax]);
  }, [waveHeightMin, waveHeightMax]);
  useEffect(() => {
    setLocalWavePeriod(wavePeriodMin);
  }, [wavePeriodMin]);

  // At least one must be enabled
  const isOnlyActive = (which: "wind" | "wave") =>
    (which === "wind" && windEnabled && !waveEnabled) ||
    (which === "wave" && waveEnabled && !windEnabled);

  return (
    <form className="flex flex-col">
      <ConditionRow>
        <div>
          <Label className="localized-label text-foreground text-sm font-bold tracking-[0.09em] uppercase">
            {t("spots")}
          </Label>
        </div>
        <div className="min-w-0">
          <LocationMultiSelect locations={locations} onLocationsChange={onLocationsChange} />
          <p className="mt-1 text-xs text-muted-foreground">{t("spotsHelp")}</p>
        </div>
      </ConditionRow>

      {/* Wind Section */}
      <ConditionRow>
        <div>
          <div className="flex items-center gap-2">
            {wavesForecastEnabled && (
              <Switch
                id="wind-toggle"
                aria-label={t("toggleWind")}
                checked={windEnabled}
                onCheckedChange={onWindEnabledChange}
                disabled={isOnlyActive("wind")}
              />
            )}
            <Label
              htmlFor={wavesForecastEnabled ? "wind-toggle" : undefined}
              className="localized-label text-foreground text-sm font-bold tracking-[0.09em] uppercase"
            >
              {t("wind")}
            </Label>
          </div>
        </div>
        <div className="min-w-0">
          {windEnabled && (
            <WindRangeField min={windMin} max={windMax} onChange={onWindRangeChange} />
          )}
        </div>
      </ConditionRow>

      {/* Wave Section */}
      {wavesForecastEnabled && (
        <ConditionRow>
          <div>
            <div className="flex items-center gap-2">
              <Switch
                id="wave-toggle"
                aria-label={t("toggleWaves")}
                checked={waveEnabled}
                onCheckedChange={onWaveEnabledChange}
                disabled={isOnlyActive("wave")}
              />
              <Label
                htmlFor="wave-toggle"
                className="localized-label text-foreground text-sm font-bold tracking-[0.09em] uppercase"
              >
                {t("waves")}
              </Label>
            </div>
            {waveEnabled && (
              <span dir="ltr" className="text-foreground text-base font-bold tabular-nums">
                {number(localWaveHeight[0])} – {number(localWaveHeight[1])} {t("unitMeters")}
              </span>
            )}
          </div>
          <div className="min-w-0">
            {waveEnabled && (
              <div className="flex flex-col gap-3 ps-1">
                <RadioGroup
                  value={waveSource}
                  onValueChange={(v) => onWaveSourceChange(v as WaveSource)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="total" id="wave-total" />
                    <Label htmlFor="wave-total" className="text-sm text-foreground/80">
                      {t("total")}
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="swell" id="wave-swell" />
                    <Label htmlFor="wave-swell" className="text-sm text-foreground/80">
                      {t("swell")}
                    </Label>
                  </div>
                </RadioGroup>

                <div aria-label={t("waveRange")}>
                  <Slider
                    locale={intlLocale}
                    getAriaLabel={(index) => t(index === 0 ? "waveMinimum" : "waveMaximum")}
                    getAriaValueText={(_formatted, value) => `${number(value)} ${t("unitMeters")}`}
                    value={localWaveHeight}
                    onValueChange={setLocalWaveHeight}
                    onValueCommitted={([min, max]) => onWaveHeightRangeChange([min, max])}
                    min={0}
                    max={3}
                    step={0.1}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="min-period" className="text-foreground/80 text-sm">
                    {t("minPeriod")}
                  </Label>
                  <span dir="ltr" className="text-foreground text-sm tabular-nums">
                    {number(localWavePeriod)} {t("unitSeconds")}
                  </span>
                </div>
                <div aria-label={t("minPeriodA11y")}>
                  <Slider
                    locale={intlLocale}
                    getAriaLabel={() => t("minPeriod")}
                    getAriaValueText={(_formatted, value) => `${number(value)} ${t("unitSeconds")}`}
                    id="min-period"
                    value={localWavePeriod}
                    onValueChange={(v) => {
                      setLocalWavePeriod(v);
                      onWavePeriodMinChange(v);
                    }}
                    min={0}
                    max={20}
                    step={1}
                  />
                </div>
              </div>
            )}
          </div>
        </ConditionRow>
      )}

      <MinSessionField value={minSessionHours} onChange={onMinSessionHoursChange} />

      <details className="border-t-2 border-foreground/20 pt-6 md:col-span-2">
        <summary className="localized-label cursor-pointer text-sm font-bold tracking-[0.09em] uppercase">
          {t("advanced")}
        </summary>
        <div className="mt-4 flex max-w-md flex-col gap-3">
          <div>
            <Label
              htmlFor="model"
              className="text-foreground text-sm font-bold tracking-[0.09em] uppercase"
            >
              {t("forecastModel")}
            </Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("modelHelp")}</p>
          </div>
          <Select
            value={model.toString()}
            onValueChange={(v) => {
              if (v === null) return;
              const num = Number(v);
              const model = Number.isNaN(num) ? v : num;
              if (isValidModelId(model)) onModelChange(model);
            }}
          >
            <SelectTrigger id="model" className="rounded-sm border-2 border-input bg-transparent">
              <SelectValue>{MODELS[model].name}</SelectValue>
            </SelectTrigger>
            <SelectContent className="border-2 border-[#04090b] bg-[#c9e4dd] text-[#04090b]">
              <SelectGroup>
                <SelectLabel>{t("openMeteoRecommended")}</SelectLabel>
                {Object.values(MODELS)
                  .filter((m) => m.provider === "openmeteo")
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.name}
                    </SelectItem>
                  ))}
              </SelectGroup>
              {windguruForecastModelsEnabled && (
                <>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Windguru</SelectLabel>
                    {Object.values(MODELS)
                      .filter((m) => m.provider === "windguru")
                      .map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id.toString()}
                          disabled={!availableModels.includes(m.id as number)}
                        >
                          {m.name}
                          {!availableModels.includes(m.id as number) && ` (${t("unavailable")})`}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </details>
    </form>
  );
}
