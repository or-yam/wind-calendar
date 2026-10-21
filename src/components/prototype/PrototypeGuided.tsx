import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { ConfigForm } from "../ConfigForm";
import { LocationMultiSelect } from "../LocationMultiSelect";
import type { HeroProps } from "../Hero";
import { LOCATIONS } from "@shared/locations";
import { PrototypeSync } from "./PrototypeSync";

export function VariantC(props: HeroProps) {
  const [step, setStep] = useState(1);
  const spots = props.locations
    .map((id) => LOCATIONS[id as keyof typeof LOCATIONS].label)
    .join(", ");
  const steps = [
    { title: "Pick your spots", summary: spots },
    {
      title: "Set your conditions",
      summary: `${props.windEnabled ? `${props.windMin}–${props.windMax} kn wind · ` : ""}${props.waveEnabled ? `${props.waveHeightMin}–${props.waveHeightMax} m waves · ` : ""}${props.minSessionHours}+ hr sessions`,
    },
    { title: "Add to your calendar", summary: "Choose Apple, Google, or Outlook" },
  ];
  const next = () => {
    setStep(step + 1);
    document
      .getElementById("conditions-heading")
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  return (
    <section className="content-wrap pb-10" aria-labelledby="conditions-heading">
      <h2
        id="conditions-heading"
        className="sticker-heading scroll-mt-5 !text-[clamp(1.6rem,4vw,2.4rem)]"
      >
        Your next session starts here
      </h2>
      <div className="config-panel !transform-none">
        {steps.map(({ title, summary }, index) => {
          const number = index + 1;
          return (
            <div key={title} className="border-b-2 border-[#04090b]/15 last:border-0">
              <button
                type="button"
                onClick={() => setStep(number)}
                aria-expanded={step === number}
                aria-controls={`prototype-step-${number}`}
                className="flex w-full cursor-pointer items-center gap-3 p-5 text-left md:px-7"
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full border-2 border-[#04090b] text-sm font-bold ${step === number ? "bg-[#ff3d8d]" : "bg-[#04090b] text-[#c9e4dd]"}`}
                >
                  {step > number ? <Check size={17} /> : `0${number}`}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold">{title}</span>
                  {step !== number && (
                    <span className="block truncate text-sm text-[#314c4b]">{summary}</span>
                  )}
                </span>
                {step !== number && (
                  <span className="text-xs font-bold underline">
                    {number < step ? "Edit" : "Open"}
                  </span>
                )}
              </button>
              {step === number && (
                <div id={`prototype-step-${number}`} className="px-5 pb-6 md:pr-7 md:pl-[4.4rem]">
                  {number === 1 && (
                    <div className="max-w-lg">
                      <p className="mb-3 text-sm text-[#314c4b]">
                        Choose up to 3 spots you would head out to.
                      </p>
                      <LocationMultiSelect
                        locations={props.locations}
                        onLocationsChange={props.onLocationsChange}
                      />
                    </div>
                  )}
                  {number === 2 && (
                    <div className="prototype-form prototype-guided-conditions">
                      <ConfigForm {...props} />
                    </div>
                  )}
                  {number === 3 && (
                    <>
                      <p className="mb-4 text-sm text-[#314c4b]">
                        {spots} · Matching sessions will appear alongside your everyday plans.
                      </p>
                      <PrototypeSync />
                    </>
                  )}
                  {number < 3 && (
                    <button
                      type="button"
                      onClick={next}
                      className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border-2 border-[#04090b] bg-[#04090b] px-5 py-2 text-sm font-bold text-[#c9e4dd] hover:bg-[#284248]"
                    >
                      {number === 1 ? "Set my conditions" : "Choose my calendar"}
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
