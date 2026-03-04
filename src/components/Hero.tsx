import { ConfigForm } from "./ConfigForm";
import type { WaveSource } from "@shared/types";

export interface HeroProps {
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

export function Hero(props: HeroProps) {
  return (
    <section className="bg-[#0B1220] py-16 px-5">
      <div className="text-center">
        <h1 className="text-[42px] font-bold mb-4 tracking-tight bg-linear-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">
          Wind Calendar
        </h1>
        <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
          Auto-sync wind sessions to your calendar. Only see the days worth surfing.
        </p>
      </div>
      <ConfigForm {...props} />
    </section>
  );
}
