import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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

interface ConfigFormProps {
  location: string;
  model: number | string;
  availableModels: number[];
  windMin: number;
  windMax: number;
  minSessionHours: number;
  onLocationChange: (location: string) => void;
  onModelChange: (model: number | string) => void;
  onWindMinChange: (value: number) => void;
  onWindMaxChange: (value: number) => void;
  onMinSessionHoursChange: (value: number) => void;
}

const LOCATIONS_ARRAY = Object.entries(LOCATIONS).map(([key, { label }]) => ({
  key,
  label,
}));

export function ConfigForm({
  location,
  model,
  availableModels,
  windMin,
  windMax,
  minSessionHours,
  onLocationChange,
  onModelChange,
  onWindMinChange,
  onWindMaxChange,
  onMinSessionHoursChange,
}: ConfigFormProps) {
  const [localWind, setLocalWind] = useState([windMin, windMax]);
  const [localSession, setLocalSession] = useState(minSessionHours);

  // Sync when parent value changes (e.g. URL param update)
  useEffect(() => {
    setLocalWind([windMin, windMax]);
  }, [windMin, windMax]);
  useEffect(() => {
    setLocalSession(minSessionHours);
  }, [minSessionHours]);

  return (
    <form className="flex flex-col gap-5 max-w-xl mx-auto py-8 px-5">
      <div className="flex flex-col gap-3">
        <Label htmlFor="spot" className="text-slate-200">
          Spot
        </Label>
        <Select value={location} onValueChange={onLocationChange}>
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
        <Label htmlFor="model" className="text-slate-200">
          Forecast Model
        </Label>
        <Select
          value={model.toString()}
          onValueChange={(v) => {
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label className="text-slate-200">Wind Range</Label>
          <span className="text-slate-200 text-sm tabular-nums">
            {localWind[0]} – {localWind[1]} kn
          </span>
        </div>
        <Slider
          value={localWind}
          onValueChange={setLocalWind}
          onValueCommit={([min, max]) => {
            onWindMinChange(min);
            onWindMaxChange(max);
          }}
          min={5}
          max={50}
          step={1}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label className="text-slate-200">Min Session</Label>
          <span className="text-slate-200 text-sm tabular-nums">{localSession} hrs</span>
        </div>
        <Slider
          value={[localSession]}
          onValueChange={([v]) => setLocalSession(v)}
          onValueCommit={([v]) => onMinSessionHoursChange(v)}
          min={0.5}
          max={8}
          step={0.5}
        />
      </div>
    </form>
  );
}
