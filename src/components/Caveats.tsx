import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function Caveats() {
  return (
    <section className="bg-[#0B1220] py-16 px-5">
      <h2 className="text-2xl font-semibold text-slate-200 mb-8 text-center">Notes & FAQ</h2>
      <div className="max-w-2xl mx-auto">
        <Accordion type="single" collapsible className="flex flex-col gap-3">
          <AccordionItem
            value="sync-frequency"
            className="bg-[#111827] border border-[#1F2937] rounded-lg px-4"
          >
            <AccordionTrigger className="text-slate-200 font-medium">
              Sync Frequency
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-sm leading-relaxed">
              Calendar refresh rates vary by provider: Apple Calendar ~15 minutes (configurable),
              Google Calendar ~12–24 hours (can't be changed), Outlook ~12 hours. Changes to your
              wind settings won't appear instantly.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="forecast-accuracy"
            className="bg-[#111827] border border-[#1F2937] rounded-lg px-4"
          >
            <AccordionTrigger className="text-slate-200 font-medium">
              Forecast Accuracy
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-sm leading-relaxed">
              Wind predictions are forecasts, not guarantees. Always check current conditions before
              heading out. Data is sourced from third-party weather APIs and may differ from
              reality.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="forecast-data-source"
            className="bg-[#111827] border border-[#1F2937] rounded-lg px-4"
          >
            <AccordionTrigger className="text-slate-200 font-medium">
              Where does the forecast data come from?
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-sm leading-relaxed">
              Forecast data is sourced from Open-Meteo (primary) or Windguru (fallback) using public
              weather model data (GFS, ICON, GDPS, IFS-HRES) from NOAA, DWD, CMC, and ECMWF. Wind
              predictions beyond 2–3 days are inherently uncertain. Treat them as rough guidance,
              not reliable schedules.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="session-definition"
            className="bg-[#111827] border border-[#1F2937] rounded-lg px-4"
          >
            <AccordionTrigger className="text-slate-200 font-medium">
              Session Definition
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-sm leading-relaxed">
              A "session" is any consecutive block of hours where wind speed stays within your
              configured range. Events shorter than your minimum session hours are filtered out.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="daylight-hours"
            className="bg-[#111827] border border-[#1F2937] rounded-lg px-4"
          >
            <AccordionTrigger className="text-slate-200 font-medium">
              Daylight Hours
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-sm leading-relaxed">
              Only daylight hours (sunrise to sunset) are shown. Sessions starting before sunrise or
              after sunset are filtered out.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="timezone"
            className="bg-[#111827] border border-[#1F2937] rounded-lg px-4"
          >
            <AccordionTrigger className="text-slate-200 font-medium">Timezone</AccordionTrigger>
            <AccordionContent className="text-slate-400 text-sm leading-relaxed">
              All times are displayed in your local timezone. Events are stored in UTC and converted
              for display.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
