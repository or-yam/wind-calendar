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
          <Label className="text-foreground text-sm font-bold tracking-[0.09em] uppercase">
            Spots
          </Label>
        </div>
        <div className="min-w-0">
          <LocationMultiSelect locations={locations} onLocationsChange={onLocationsChange} />
          <p className="mt-1 text-xs text-muted-foreground">Select up to 3 spots.</p>
        </div>
      </ConditionRow>

      {/* Wind Section */}
      <ConditionRow>
        <div>
          <div className="flex items-center gap-2">
            {wavesForecastEnabled && (
              <Switch
                id="wind-toggle"
                aria-label="Toggle wind forecast"
                checked={windEnabled}
                onCheckedChange={onWindEnabledChange}
                disabled={isOnlyActive("wind")}
              />
            )}
            <Label
              htmlFor={wavesForecastEnabled ? "wind-toggle" : undefined}
              className="text-foreground text-sm font-bold tracking-[0.09em] uppercase"
            >
              Wind
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
                aria-label="Toggle wave forecast"
                checked={waveEnabled}
                onCheckedChange={onWaveEnabledChange}
                disabled={isOnlyActive("wave")}
              />
              <Label
                htmlFor="wave-toggle"
                className="text-foreground text-sm font-bold tracking-[0.09em] uppercase"
              >
                Waves
              </Label>
            </div>
            {waveEnabled && (
              <span className="text-foreground text-base font-bold tabular-nums">
                {localWaveHeight[0]} – {localWaveHeight[1]} m
              </span>
            )}
          </div>
          <div className="min-w-0">
            {waveEnabled && (
              <div className="flex flex-col gap-3 pl-1">
                <RadioGroup
                  value={waveSource}
                  onValueChange={(v) => onWaveSourceChange(v as WaveSource)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="total" id="wave-total" />
                    <Label htmlFor="wave-total" className="text-sm text-foreground/80">
                      Total
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="swell" id="wave-swell" />
                    <Label htmlFor="wave-swell" className="text-sm text-foreground/80">
                      Swell
                    </Label>
                  </div>
                </RadioGroup>

                <div aria-label="Wave height range in meters">
                  <Slider
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
                    Min Period
                  </Label>
                  <span className="text-foreground text-sm tabular-nums">{localWavePeriod} s</span>
                </div>
                <div aria-label="Minimum wave period in seconds">
                  <Slider
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
        <summary className="cursor-pointer text-sm font-bold tracking-[0.09em] uppercase">
          Advanced
        </summary>
        <div className="mt-4 flex max-w-md flex-col gap-3">
          <div>
            <Label
              htmlFor="model"
              className="text-foreground text-sm font-bold tracking-[0.09em] uppercase"
            >
              Forecast Model
            </Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Open-Meteo ICON is the default and works for every spot.
            </p>
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
                <SelectLabel>Open-Meteo (Recommended)</SelectLabel>
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
                          {!availableModels.includes(m.id as number) && " (unavailable)"}
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
