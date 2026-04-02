import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return <AccordionPrimitive.Root className={cn("flex w-full flex-col", className)} {...props} />;
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return <AccordionPrimitive.Item className={cn("border-b", className)} {...props} />;
}

function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group/accordion-trigger flex flex-1 items-center justify-between py-4 font-medium hover:underline outline-none disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform duration-200 group-aria-expanded/accordion-trigger:hidden" />
        <ChevronUpIcon className="hidden h-4 w-4 shrink-0 transition-transform duration-200 group-aria-expanded/accordion-trigger:inline" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel className="overflow-hidden text-sm" {...props}>
      <div
        className={cn(
          "h-(--accordion-panel-height) pb-4 pt-0 data-ending-style:h-0 data-starting-style:h-0 transition-[height]",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
