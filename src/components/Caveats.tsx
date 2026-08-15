import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";

export function Caveats() {
  const { t } = useTranslation();
  return (
    <section className="night-section">
      <div className="content-wrap">
        <h2 className="sticker-heading">{t("faq")}</h2>
        <Accordion className="flex flex-col gap-3">
          <AccordionItem className="session-card px-4">
            <AccordionTrigger className="text-card-foreground font-medium">
              {t("syncFrequency")}
            </AccordionTrigger>
            <AccordionContent className="text-card-foreground/80 text-sm leading-relaxed">
              {t("syncFrequencyBody")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem className="session-card px-4">
            <AccordionTrigger className="text-card-foreground font-medium">
              {t("forecastAccuracy")}
            </AccordionTrigger>
            <AccordionContent className="text-card-foreground/80 text-sm leading-relaxed">
              {t("forecastAccuracyBody")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem className="session-card px-4">
            <AccordionTrigger className="text-card-foreground font-medium">
              {t("forecastSource")}
            </AccordionTrigger>
            <AccordionContent className="text-card-foreground/80 text-sm leading-relaxed">
              {t("forecastSourceBody")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem className="session-card px-4">
            <AccordionTrigger className="text-card-foreground font-medium">
              {t("sessionDefinition")}
            </AccordionTrigger>
            <AccordionContent className="text-card-foreground/80 text-sm leading-relaxed">
              {t("sessionDefinitionBody")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem className="session-card px-4">
            <AccordionTrigger className="text-card-foreground font-medium">
              {t("daylightHours")}
            </AccordionTrigger>
            <AccordionContent className="text-card-foreground/80 text-sm leading-relaxed">
              {t("daylightHoursBody")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem className="session-card px-4">
            <AccordionTrigger className="text-card-foreground font-medium">
              {t("timezone")}
            </AccordionTrigger>
            <AccordionContent className="text-card-foreground/80 text-sm leading-relaxed">
              {t("timezoneBody")}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
