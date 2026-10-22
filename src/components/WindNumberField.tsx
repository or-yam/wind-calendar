import { NumberField } from "@base-ui/react/number-field";
import { Minus, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

interface WindNumberFieldProps {
  id: string;
  label: string;
  value: number | null;
  min: number;
  max: number;
  invalid: boolean;
  onValueChange: (value: number | null) => void;
  onValueCommitted: (value: number | null) => void;
}

export function WindNumberField({
  id,
  label,
  value,
  min,
  max,
  invalid,
  onValueChange,
  onValueCommitted,
}: WindNumberFieldProps) {
  const stepperClass =
    "grid size-11 shrink-0 place-items-center border-2 border-input bg-background text-foreground outline-none hover:bg-accent focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <NumberField.Root
      id={id}
      value={value}
      min={min}
      max={max}
      step={1}
      allowOutOfRange
      onValueChange={onValueChange}
      onValueCommitted={onValueCommitted}
    >
      <Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-foreground/80">
        {label} (kn)
      </Label>
      <NumberField.Group className="flex">
        <NumberField.Decrement
          aria-label={`Decrease ${label.toLowerCase()} wind speed`}
          className={`${stepperClass} rounded-l-sm border-r-0`}
        >
          <Minus className="size-4" />
        </NumberField.Decrement>
        <div className="min-w-0 flex-1">
          <NumberField.Input
            aria-describedby={invalid ? "wind-range-error" : undefined}
            aria-invalid={invalid}
            inputMode="numeric"
            className="h-11 w-full min-w-0 border-2 border-input bg-background px-2 text-center text-base font-bold tabular-nums text-foreground outline-none focus:z-10 focus:ring-2 focus:ring-ring"
          />
        </div>
        <NumberField.Increment
          aria-label={`Increase ${label.toLowerCase()} wind speed`}
          className={`${stepperClass} rounded-r-sm border-l-0`}
        >
          <Plus className="size-4" />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}
