import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

type SliderProps<Value extends number | number[]> = SliderPrimitive.Root.Props<Value> & {
  ref?: React.Ref<HTMLDivElement>;
  getAriaLabel?: (index: number) => string;
  getAriaValueText?: (formattedValue: string, value: number, index: number) => string;
};

function Slider<Value extends number | number[]>({
  className,
  ref,
  getAriaLabel,
  getAriaValueText,
  ...props
}: SliderProps<Value>) {
  const thumbCount = Array.isArray(props.value)
    ? props.value.length
    : Array.isArray(props.defaultValue)
      ? props.defaultValue.length
      : 1;

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Control className="flex w-full items-center">
        <SliderPrimitive.Track className="relative h-2 w-full grow bg-control-track">
          <SliderPrimitive.Indicator className="absolute h-full bg-range" />
          {Array.from({ length: thumbCount }).map((_, i) => (
            <SliderPrimitive.Thumb
              key={i}
              index={i}
              getAriaLabel={getAriaLabel}
              getAriaValueText={getAriaValueText}
              className="h-5 w-5 rounded-full border-[3px] border-range bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-disabled:pointer-events-none data-disabled:opacity-50"
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
