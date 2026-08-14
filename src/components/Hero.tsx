import { ConfigForm } from "./ConfigForm";
import VHS from "./canvasui/VHS";
import type { WaveSource } from "@shared/types";
import type { CalendarConfig } from "@shared/types";
import type { ModelId } from "@shared/models";
import { FreeTextConfigBuilder } from "./FreeTextConfigBuilder";

export interface HeroProps {
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
  onFreeTextConfig: (config: CalendarConfig, message: string) => void;
  freeTextConfigBuilderEnabled: boolean;
}

export function Hero(props: HeroProps) {
  return (
    <>
      <header className="min-h-170 flex items-center py-20 md:py-24">
        <div className="content-wrap grid gap-y-3 md:gap-y-4">
          <VHS
            className="h-72 w-full min-[480px]:h-38 md:h-76"
            speed={0.7}
            wave={1.8}
            jitter={0.9}
            crease={0.65}
            switching={0.35}
            switchingHeight={0.05}
            bloom={0.75}
            aberration={5}
            acBeat={1}
            grain={0.22}
            scanlines={0.3}
            vignette={0.3}
          >
            <div className="grid h-full grid-cols-1 grid-rows-[auto_1fr] items-center px-5 py-5 min-[480px]:grid-cols-[minmax(0,1fr)_100px] min-[480px]:grid-rows-1 min-[480px]:gap-x-4 min-[480px]:px-2 min-[480px]:py-0 md:grid-cols-[minmax(0,1fr)_330px] md:gap-x-13 md:px-6">
              <h1 className="row-start-2 m-0 w-min -rotate-5 font-title text-[clamp(3.25rem,17vw,4.25rem)] leading-[0.82] tracking-[-0.06em] text-primary [-webkit-text-stroke:3px_#080808] [paint-order:stroke_fill] [filter:drop-shadow(4px_5px_0_var(--secondary))] min-[480px]:row-start-1 md:text-[clamp(4rem,9vw,7rem)] md:[-webkit-text-stroke:5px_#080808] md:[filter:drop-shadow(7px_8px_0_var(--secondary))]">
                <span className="grit-text block">
                  Wind
                  <br />
                  Calendar
                </span>
              </h1>
              <div className="row-start-1 grid aspect-square w-22 rotate-7 place-items-center justify-self-end rounded-full border-4 border-[#080808] bg-secondary p-1.5 shadow-[5px_6px_0_var(--primary)] outline-2 outline-secondary min-[480px]:col-start-2 min-[480px]:justify-self-auto md:w-64 md:border-[7px] md:p-[18px] md:shadow-[11px_12px_0_var(--primary)] md:outline-4">
                <div className="relative size-full overflow-hidden rounded-full border-2 border-[#080808] after:pointer-events-none after:absolute after:inset-0 after:bg-[url('/grit-texture.svg')] after:bg-[length:160px_90px] after:opacity-20 after:content-[''] md:border-4">
                  <img
                    src="/android-chrome-512x512.png"
                    alt="Wind Calendar windsurf icon"
                    className="block size-full object-cover"
                  />
                </div>
              </div>
            </div>
          </VHS>
          <p className="mt-4 max-w-xl text-xl font-bold leading-snug">
            Only the days worth surfing. No doom-scrolling the forecast.
          </p>
        </div>
      </header>

      <section className="night-section">
        <div className="content-wrap">
          <h2 className="sticker-heading">Choose your conditions</h2>
          {props.freeTextConfigBuilderEnabled && (
            <FreeTextConfigBuilder onConfig={props.onFreeTextConfig} />
          )}
          <ConfigForm {...props} />
        </div>
      </section>
    </>
  );
}
