import { ConfigForm } from "./ConfigForm";
import type { WaveSource } from "@shared/types";

export interface HeroProps {
  locations: string[];
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
  onLocationsChange: (locations: string[]) => void;
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
    <>
      <header className="min-h-170 flex items-center py-20 md:py-24">
        <div className="content-wrap grid grid-cols-[minmax(0,1fr)_100px] md:grid-cols-[minmax(0,1fr)_300px] grid-rows-[auto_auto_auto] items-center gap-x-4 gap-y-3 md:gap-x-13 md:gap-y-4">
          <p className="col-span-2 md:col-span-1 m-0 text-xs font-bold tracking-[0.18em] uppercase">
            Forecast less. Surf more.
          </p>
          <h1 className="col-start-1 row-start-2 m-0 w-min -rotate-5 font-title text-[clamp(3.25rem,17vw,4.25rem)] md:text-[clamp(4rem,9vw,7rem)] leading-[0.82] tracking-[-0.06em] text-primary [-webkit-text-stroke:3px_#080808] md:[-webkit-text-stroke:5px_#080808] [paint-order:stroke_fill] [filter:drop-shadow(4px_5px_0_var(--secondary))] md:[filter:drop-shadow(7px_8px_0_var(--secondary))]">
            <span className="grit-text block">
              Wind
              <br />
              Calendar
            </span>
          </h1>
          <div className="col-start-2 row-start-2 md:row-span-3 md:row-start-1 grid aspect-square w-24 md:w-70 place-items-center rotate-7 rounded-full border-4 md:border-[7px] border-[#080808] bg-secondary p-1.5 md:p-[18px] outline-2 md:outline-4 outline-secondary shadow-[5px_6px_0_var(--primary)] md:shadow-[11px_12px_0_var(--primary)]">
            <div className="relative size-full overflow-hidden rounded-full border-2 border-[#080808] after:pointer-events-none after:absolute after:inset-0 after:bg-[url('/grit-texture.svg')] after:bg-[length:160px_90px] after:opacity-20 after:content-[''] md:border-4">
              <img
                src="/android-chrome-512x512.png"
                alt="Wind Calendar windsurf icon"
                className="block size-full object-cover"
              />
            </div>
          </div>
          <p className="col-span-2 md:col-span-1 row-start-3 mt-4 max-w-xl text-xl font-bold leading-snug">
            Only the days worth surfing. No doom-scrolling the forecast.
          </p>
        </div>
      </header>

      <section className="night-section">
        <div className="content-wrap">
          <h2 className="sticker-heading">Build a session</h2>
          <ConfigForm {...props} />
        </div>
      </section>
    </>
  );
}
