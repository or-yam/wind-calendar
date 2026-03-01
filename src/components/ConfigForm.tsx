import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConfigFormProps {
  location: string;
  windMin: number;
  windMax: number;
  minSessionHours: number;
  onLocationChange: (location: string) => void;
  onWindMinChange: (value: number) => void;
  onWindMaxChange: (value: number) => void;
  onMinSessionHoursChange: (value: number) => void;
}

export function ConfigForm({
  location,
  windMin,
  windMax,
  minSessionHours,
  onLocationChange,
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
            <SelectItem value="beit-yanai">Beit Yanai</SelectItem>
            <SelectItem value="bat-galim">Bat-galim (Haifa)</SelectItem>
            <SelectItem value="herzliya">Herzliya</SelectItem>
            <SelectItem value="tel-aviv">Tel Aviv</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label className="text-slate-200">Wind Range</Label>
          <span className="text-slate-200 text-sm">
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
          <span className="text-slate-200 text-sm">{localSession} hrs</span>
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
