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
import { LOCATIONS } from "@shared/locations";
import { MODELS } from "@shared/models";
import type { WaveSource } from "@shared/types";

interface ConfigFormProps {
  location: string;
  model: number | string;
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
  onLocationChange: (location: string) => void;
  onModelChange: (model: number | string) => void;
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

const toNum = (v: number | readonly number[]): number => (Array.isArray(v) ? v[0] : v) as number;

const LOCATIONS_ARRAY = Object.entries(LOCATIONS).map(([key, { label }]) => ({
  key,
  label,
}));

const locationSelectItems = LOCATIONS_ARRAY.map((loc) => ({ value: loc.key, label: loc.label }));

const modelSelectItems = [
  {
    label: "Open-Meteo (Recommended)",
    items: Object.values(MODELS)
      .filter((m) => m.provider === "openmeteo")
      .map((m) => ({ value: m.id.toString(), label: m.name })),
  },
  {
    label: "Windguru",
    items: Object.values(MODELS)
      .filter((m) => m.provider === "windguru")
      .map((m) => ({ value: m.id.toString(), label: m.name })),
  },
];

export function ConfigForm({
  location,
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
  onLocationChange,
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
    <form className="flex flex-col gap-6 max-w-xl mx-auto py-8 px-5">
      <div className="flex flex-col gap-3">
        <Label htmlFor="spot" className="text-foreground">
          Spot
        </Label>
        <Select
          value={location}
          items={locationSelectItems}
          onValueChange={(v) => v != null && onLocationChange(v)}
        >
          <SelectTrigger id="spot">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCATIONS_ARRAY.map((loc) => (
              <SelectItem key={loc.key} value={loc.key}>
                {loc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="model" className="text-foreground">
          Forecast Model
        </Label>
        <Select
          value={model.toString()}
          items={modelSelectItems}
          onValueChange={(v) => {
            if (v == null) return;
            const num = Number(v);
            onModelChange(Number.isNaN(num) ? v : num);
          }}
        >
          <SelectTrigger id="model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
          </SelectContent>
        </Select>
      </div>

      {/* Wind Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="wind-toggle"
              aria-label="Toggle wind forecast"
              checked={windEnabled}
              onCheckedChange={onWindEnabledChange}
              disabled={isOnlyActive("wind")}
            />
            <Label htmlFor="wind-toggle" className="text-foreground">
              ► Wind
            </Label>
          </div>
          {windEnabled && (
            <span className="text-foreground text-sm tabular-nums">
              {localWind[0]} – {localWind[1]} kn
            </span>
          )}
        </div>
        {windEnabled && (
          <div aria-label="Wind speed range in knots">
            <Slider
              value={localWind}
              onValueChange={(v) => setLocalWind(v as number[])}
              onValueCommitted={(v) => {
                const [min, max] = v as number[];
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
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="wave-toggle"
              aria-label="Toggle wave forecast"
              checked={waveEnabled}
              onCheckedChange={onWaveEnabledChange}
              disabled={isOnlyActive("wave")}
            />
            <Label htmlFor="wave-toggle" className="text-foreground">
              ≈ Waves
            </Label>
          </div>
          {waveEnabled && (
            <span className="text-foreground text-sm tabular-nums">
              {localWaveHeight[0].toFixed(1)} – {localWaveHeight[1].toFixed(1)} m
            </span>
          )}
        </div>
        {waveEnabled && (
          <div className="flex flex-col gap-3 pl-1">
            <RadioGroup
              value={waveSource}
              onValueChange={(v) => onWaveSourceChange(v as WaveSource)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="total" id="wave-total" />
                <Label htmlFor="wave-total" className="text-sm text-secondary-text">
                  Total
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="swell" id="wave-swell" />
                <Label htmlFor="wave-swell" className="text-sm text-secondary-text">
                  Swell
                </Label>
              </div>
            </RadioGroup>

            <div aria-label="Wave height range in meters">
              <Slider
                value={localWaveHeight}
                onValueChange={(v) => setLocalWaveHeight(v as number[])}
                onValueCommitted={(v) => {
                  const [min, max] = v as number[];
                  onWaveHeightMinChange(min);
                  onWaveHeightMaxChange(max);
                }}
                min={0}
                max={8}
                step={0.1}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="min-period" className="text-secondary-text text-sm">
                Min Period
              </Label>
              <span className="text-foreground text-sm tabular-nums">{localWavePeriod} s</span>
            </div>
            <div aria-label="Minimum wave period in seconds">
              <Slider
                id="min-period"
                value={[localWavePeriod]}
                onValueChange={(v) => setLocalWavePeriod(toNum(v))}
                onValueCommitted={(v) => onWavePeriodMinChange(toNum(v))}
                min={0}
                max={20}
                step={1}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label id="min-session-label" htmlFor="min-session" className="text-foreground">
            Min Session
          </Label>
          <span className="text-foreground text-sm tabular-nums">
            {localSession.toFixed(1)} hrs
          </span>
        </div>
        <Slider
          id="min-session"
          aria-labelledby="min-session-label"
          value={[localSession]}
          onValueChange={(v) => setLocalSession(toNum(v))}
          onValueCommitted={(v) => onMinSessionHoursChange(toNum(v))}
          min={0.5}
          max={8}
          step={0.5}
        />
      </div>
    </form>
  );
}
