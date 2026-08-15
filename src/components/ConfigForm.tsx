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
import { useTranslation } from "react-i18next";
import type { Locale } from "@/i18n/locale";
import { localeMetadata } from "@/i18n/locale";
import { formatNumber } from "@/lib/date-utils";

interface ConfigFormProps {
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
  onLocationsChange: (locations: string[]) => void;
  onModelChange: (model: ModelId) => void;
  onWindEnabledChange: (enabled: boolean) => void;
  onWindMinChange: (value: number) => void;
  onWindMaxChange: (value: number) => void;
  onWaveEnabledChange: (enabled: boolean) => void;
  onWaveSourceChange: (source: WaveSource) => void;
  onWaveHeightMinChange: (value: number) => void;
  onWaveHeightMaxChange: (value: number) => void;
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
  onLocationsChange,
  onModelChange,
  onWindEnabledChange,
  onWindMinChange,
  onWindMaxChange,
  onWaveEnabledChange,
  onWaveSourceChange,
  onWaveHeightMinChange,
  onWaveHeightMaxChange,
  onWavePeriodMinChange,
  onMinSessionHoursChange,
}: ConfigFormProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const intlLocale = localeMetadata[locale].intl;
  const number = (value: number) => formatNumber(value, locale, { maximumFractionDigits: 1 });
  const [localWind, setLocalWind] = useState([windMin, windMax]);
  const [localSession, setLocalSession] = useState(minSessionHours);
  const [localWaveHeight, setLocalWaveHeight] = useState([waveHeightMin, waveHeightMax]);
  const [localWavePeriod, setLocalWavePeriod] = useState(wavePeriodMin);

  useEffect(() => {
    setLocalWind([windMin, windMax]);
  }, [windMin, windMax]);
  useEffect(() => {
    setLocalSession(minSessionHours);
  }, [minSessionHours]);
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
    <form className="config-panel grid grid-cols-1 gap-x-10 gap-y-7 p-6 md:grid-cols-2 md:p-8">
      <div className="flex flex-col gap-3">
        <Label className="localized-label text-foreground text-sm font-bold tracking-[0.09em] uppercase">
          {t("spots")}
        </Label>
        <LocationMultiSelect locations={locations} onLocationsChange={onLocationsChange} />
        <p className="text-xs text-muted-foreground">{t("spotsHelp")}</p>
      </div>

      {/* Wind Section */}
      <div className="flex flex-col gap-3 border-t-2 border-foreground/20 pt-6 md:border-t-0 md:pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="wind-toggle"
              aria-label={t("toggleWind")}
              checked={windEnabled}
              onCheckedChange={onWindEnabledChange}
              disabled={isOnlyActive("wind")}
            />
            <Label
              htmlFor="wind-toggle"
              className="localized-label text-foreground text-sm font-bold tracking-[0.09em] uppercase"
            >
              {t("wind")}
            </Label>
          </div>
          {windEnabled && (
            <span dir="ltr" className="text-foreground text-base font-bold tabular-nums">
              {number(localWind[0])} – {number(localWind[1])} {t("unitKnots")}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("windHelp")}</p>
        {windEnabled && (
          <div aria-label={t("windRange")}>
            <Slider
              locale={intlLocale}
              getAriaLabel={(index) => t(index === 0 ? "windMinimum" : "windMaximum")}
              getAriaValueText={(_formatted, value) => `${number(value)} ${t("unitKnots")}`}
              value={localWind}
              onValueChange={setLocalWind}
              onValueCommitted={([min, max]) => {
                onWindMinChange(min);
                onWindMaxChange(max);
              }}
              min={5}
              max={50}
              step={1}
            />
          </div>
        )}
      </div>

      {/* Wave Section */}
      <div className="flex flex-col gap-3 border-t-2 border-foreground/20 pt-6 md:border-t-0 md:pt-0">
        <div className="flex items-center justify-between">
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
        <p className="text-xs leading-relaxed text-muted-foreground">{t("wavesHelp")}</p>
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
                onValueCommitted={([min, max]) => {
                  onWaveHeightMinChange(min);
                  onWaveHeightMaxChange(max);
                }}
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

      <div className="flex flex-col gap-3 border-t-2 border-foreground/20 pt-6 md:col-span-2">
        <div className="flex items-center justify-between">
          <Label
            id="min-session-label"
            htmlFor="min-session"
            className="localized-label text-foreground text-sm font-bold tracking-[0.09em] uppercase"
          >
            {t("minSession")}
          </Label>
          <span dir="ltr" className="text-foreground text-base font-bold tabular-nums">
            {number(localSession)} {t("unitHours", { count: localSession })}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("minSessionHelp")}</p>
        <Slider
          locale={intlLocale}
          getAriaLabel={() => t("minSession")}
          getAriaValueText={(_formatted, value) =>
            `${number(value)} ${t("unitHours", { count: value })}`
          }
          id="min-session"
          aria-labelledby="min-session-label"
          value={localSession}
          onValueChange={(v) => {
            setLocalSession(v);
            onMinSessionHoursChange(v);
          }}
          min={0.5}
          max={8}
          step={0.5}
        />
      </div>

      <details className="border-t-2 border-foreground/20 pt-6 md:col-span-2">
        <summary className="localized-label cursor-pointer text-sm font-bold tracking-[0.09em] uppercase">
          {t("advanced")}
        </summary>
        <div className="mt-4 flex max-w-md flex-col gap-3">
          <div>
            <Label
              htmlFor="model"
              className="localized-label text-foreground text-sm font-bold tracking-[0.09em] uppercase"
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
              <SelectValue>
                <bdi>{MODELS[model].name}</bdi>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="border-2 border-[#04090b] bg-[#c9e4dd] text-[#04090b]">
              <SelectGroup>
                <SelectLabel>{t("openMeteoRecommended")}</SelectLabel>
                {Object.values(MODELS)
                  .filter((m) => m.provider === "openmeteo")
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      <bdi>{m.name}</bdi>
                    </SelectItem>
                  ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>
                  <bdi>Windguru</bdi>
                </SelectLabel>
                {Object.values(MODELS)
                  .filter((m) => m.provider === "windguru")
                  .map((m) => (
                    <SelectItem
                      key={m.id}
                      value={m.id.toString()}
                      disabled={!availableModels.includes(m.id as number)}
                    >
                      <bdi>{m.name}</bdi>
                      {!availableModels.includes(m.id as number) && ` (${t("unavailable")})`}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </details>
    </form>
  );
}
