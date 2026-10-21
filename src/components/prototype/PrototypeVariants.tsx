import { CalendarPlus } from "lucide-react";
import type { HeroProps } from "../Hero";
import { ConfigForm } from "../ConfigForm";
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
        <div className="mt-6 flex flex-col gap-4 border-t-2 border-[#04090b]/20 pt-5 sm:flex-row sm:items-start sm:justify-between">
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
    </section>
  );
}
