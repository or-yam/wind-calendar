import { useLocale } from "@/hooks/useLocale";
import { NumberField } from "@base-ui/react/number-field";
import { Minus, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

interface WindNumberFieldProps {
  id: string;
  bound: "minimum" | "maximum";
  value: number | null;
  min: number;
  max: number;
  invalid: boolean;
  onValueChange: (value: number | null) => void;
  onValueCommitted: (value: number | null) => void;
}

export function WindNumberField({
  id,
  bound,
  value,
  min,
  max,
  invalid,
  onValueChange,
  onValueCommitted,
}: WindNumberFieldProps) {
  const { t, intl } = useLocale();
  const stepperClass =
    "grid size-11 shrink-0 place-items-center border-2 border-input bg-background text-foreground outline-none hover:bg-accent focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <NumberField.Root
      locale={intl}
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
        {t(bound)} ({t("unitKnots")})
      </Label>
      <NumberField.Group className="flex">
        <NumberField.Decrement
          aria-label={t(bound === "minimum" ? "decreaseWindMinimum" : "decreaseWindMaximum")}
          className={`${stepperClass} rounded-s-sm border-e-0`}
        >
          <Minus className="size-4" />
        </NumberField.Decrement>
        <div className="min-w-0 flex-1">
          <NumberField.Input
            dir="ltr"
            aria-describedby={invalid ? "wind-range-error" : undefined}
            aria-invalid={invalid}
            inputMode="numeric"
            className="h-11 w-full min-w-0 border-2 border-input bg-background px-2 text-center text-base font-bold tabular-nums text-foreground outline-none focus:z-10 focus:ring-2 focus:ring-ring"
          />
        </div>
        <NumberField.Increment
          aria-label={t(bound === "minimum" ? "increaseWindMinimum" : "increaseWindMaximum")}
          className={`${stepperClass} rounded-e-sm border-s-0`}
        >
          <Plus className="size-4" />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}
