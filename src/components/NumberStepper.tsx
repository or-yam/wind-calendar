import { NumberField } from "@base-ui/react/number-field";
import { Minus, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

interface NumberStepperProps {
  id: string;
  label: string;
  stepperLabel: string;
  value: number | null;
  min: number;
  max: number;
  step?: number;
  invalid?: boolean;
  errorId?: string;
  allowOutOfRange?: boolean;
  onValueChange: (value: number | null) => void;
  onValueCommitted: (value: number | null) => void;
}

export function NumberStepper({
  id,
  label,
  stepperLabel,
  value,
  min,
  max,
  step = 1,
  invalid = false,
  errorId,
  allowOutOfRange = false,
  onValueChange,
  onValueCommitted,
}: NumberStepperProps) {
  const stepperClass =
    "grid size-11 shrink-0 place-items-center border-2 border-input bg-background text-foreground outline-none hover:bg-accent focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <NumberField.Root
      id={id}
      value={value}
      min={min}
      max={max}
      step={step}
      allowOutOfRange={allowOutOfRange}
      onValueChange={onValueChange}
      onValueCommitted={onValueCommitted}
    >
      <Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-foreground/80">
        {label}
      </Label>
      <NumberField.Group className="flex">
        <NumberField.Decrement
          aria-label={`Decrease ${stepperLabel}`}
          className={`${stepperClass} rounded-l-sm border-r-0`}
        >
          <Minus className="size-4" />
        </NumberField.Decrement>
        <div className="min-w-0 flex-1">
          <NumberField.Input
            aria-describedby={invalid ? errorId : undefined}
            aria-invalid={invalid}
            inputMode={Number.isInteger(step) ? "numeric" : "decimal"}
            className="h-11 w-full min-w-0 border-2 border-input bg-background px-2 text-center text-base font-bold tabular-nums text-foreground outline-none focus:z-10 focus:ring-2 focus:ring-ring"
          />
        </div>
        <NumberField.Increment
          aria-label={`Increase ${stepperLabel}`}
          className={`${stepperClass} rounded-r-sm border-l-0`}
        >
          <Plus className="size-4" />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}
