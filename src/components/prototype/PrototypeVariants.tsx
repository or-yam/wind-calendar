import { ArrowDown, CalendarPlus } from "lucide-react";
import type { HeroProps } from "../Hero";
import { ConfigForm } from "../ConfigForm";
import { LOCATIONS } from "@shared/locations";
import { PrototypeSync } from "./PrototypeSync";

export function VariantA(props: HeroProps) {
  return (
    <section className="content-wrap pb-10" aria-labelledby="conditions-heading">
      <h2 id="conditions-heading" className="sticker-heading !text-[clamp(1.6rem,4vw,2.4rem)]">
        Choose your conditions
      </h2>
      <div className="config-panel !transform-none p-5 md:p-7">
        <div className="prototype-form">
          <ConfigForm {...props} />
        </div>
        <div className="mt-6 grid gap-4 border-t-2 border-[#04090b]/20 pt-5 md:grid-cols-[190px_1fr]">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <CalendarPlus size={20} />
              Add to your calendar
            </h3>
            <p className="mt-1 text-sm text-[#314c4b]">Your conditions, on your schedule.</p>
          </div>
          <PrototypeSync />
        </div>
      </div>
      <a
        href="#upcoming-preview"
        className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary"
      >
        Check upcoming sessions first
        <ArrowDown size={14} />
      </a>
    </section>
  );
}

export function VariantB(props: HeroProps) {
  const spots = props.locations
    .map((id) => LOCATIONS[id as keyof typeof LOCATIONS].label)
    .join(", ");
  return (
    <section className="content-wrap pb-10" aria-labelledby="conditions-heading">
      <h2 id="conditions-heading" className="sticker-heading !text-[clamp(1.6rem,4vw,2.4rem)]">
        Build your surf calendar
      </h2>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="config-panel !transform-none p-5 md:p-7">
          <h3 className="mb-5 text-lg font-bold uppercase">
            <span className="mr-2 text-[#956044]">01 /</span>Choose your conditions
          </h3>
          <div className="prototype-form">
            <ConfigForm {...props} />
          </div>
        </div>
        <aside className="rounded-sm border-2 border-secondary bg-card p-5 shadow-[5px_5px_0_#ff3d8d]">
          <h3 className="text-lg font-bold uppercase">
            <span className="mr-2 text-secondary">02 /</span>Add to your calendar
          </h3>
          <div className="my-5 border-y border-border py-4">
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              Your subscription
            </p>
            <p className="mt-2 text-xl font-bold">{spots}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {props.windEnabled ? `${props.windMin}–${props.windMax} kn wind · ` : ""}
              {props.minSessionHours}+ hr sessions
            </p>
            {props.waveEnabled && (
              <p className="mt-1 text-sm text-muted-foreground">
                {props.waveHeightMin}–{props.waveHeightMax} m {props.waveSource} ·{" "}
                {props.wavePeriodMin}+ s
              </p>
            )}
          </div>
          <PrototypeSync stacked />
          <a
            href="#upcoming-preview"
            className="mt-5 inline-flex items-center gap-2 text-sm text-secondary underline-offset-4 hover:underline"
          >
            Preview sessions
            <ArrowDown size={13} />
          </a>
        </aside>
      </div>
    </section>
  );
}
