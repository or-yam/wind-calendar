import * as React from "react";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive className={cn("grid gap-2", className)} {...props} ref={ref} />
));
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof Radio.Root>,
  React.ComponentPropsWithoutRef<typeof Radio.Root>
>(({ className, ...props }, ref) => (
  <Radio.Root
    ref={ref}
    className={cn(
      "aspect-square h-4 w-4 rounded-full border border-control-off text-primary shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring data-disabled:cursor-not-allowed data-disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <Radio.Indicator className="flex items-center justify-center">
      <div className="h-2 w-2 rounded-full bg-primary" />
    </Radio.Indicator>
  </Radio.Root>
));
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
