import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function Caveats() {
  return (
    <section className="night-section">
      <div className="content-wrap">
        <h2 className="sticker-heading">Notes &amp; FAQ</h2>
        <Accordion className="flex flex-col gap-3">
          <AccordionItem className="session-card px-4">
            <AccordionTrigger className="text-card-foreground font-medium">
              Sync Frequency
            </AccordionTrigger>
            <AccordionContent className="text-card-foreground/80 text-sm leading-relaxed">
              Calendar refresh rates vary by provider: Apple Calendar ~15 minutes (configurable),
              Google Calendar ~12–24 hours (can't be changed), Outlook ~12 hours. Changes to your
              wind settings won't appear instantly.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem className="session-card px-4">
            <AccordionTrigger className="text-card-foreground font-medium">
              Forecast Accuracy
            </AccordionTrigger>
            <AccordionContent className="text-card-foreground/80 text-sm leading-relaxed">
              Wind predictions are forecasts, not guarantees. Always check current conditions before
              heading out. Data is sourced from third-party weather APIs and may differ from
              reality.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem className="session-card px-4">
            <AccordionTrigger className="text-card-foreground font-medium">
              Where does the forecast data come from?
            </AccordionTrigger>
            <AccordionContent className="text-card-foreground/80 text-sm leading-relaxed">
              Forecast data is sourced from Open-Meteo (primary) or Windguru (fallback) using public
              weather model data (GFS, ICON, GDPS, IFS-HRES) from NOAA, DWD, CMC, and ECMWF. Wind
              predictions beyond 2–3 days are inherently uncertain. Treat them as rough guidance,
              not reliable schedules.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem className="session-card px-4">
            <AccordionTrigger className="text-card-foreground font-medium">
              Session Definition
            </AccordionTrigger>
            <AccordionContent className="text-card-foreground/80 text-sm leading-relaxed">
              A "session" is any consecutive block of hours where wind speed stays within your
              configured range. Events shorter than your minimum session hours are filtered out.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem className="session-card px-4">
            <AccordionTrigger className="text-card-foreground font-medium">
              Daylight Hours
            </AccordionTrigger>
            <AccordionContent className="text-card-foreground/80 text-sm leading-relaxed">
              Only daylight hours (sunrise to sunset) are shown. Sessions starting before sunrise or
              after sunset are filtered out.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem className="session-card px-4">
            <AccordionTrigger className="text-card-foreground font-medium">
              Timezone
            </AccordionTrigger>
            <AccordionContent className="text-card-foreground/80 text-sm leading-relaxed">
              All times are displayed in your local timezone. Events are stored in UTC and converted
              for display.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
