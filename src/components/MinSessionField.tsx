import { useEffect, useState } from "react";
import { NumberStepper } from "./NumberStepper";

interface MinSessionFieldProps {
  value: number;
  onChange: (value: number) => void;
}

export function MinSessionField({ value, onChange }: MinSessionFieldProps) {
  const [draft, setDraft] = useState<number | null>(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <div className="grid items-end gap-4 border-t-2 border-foreground/20 pt-6 md:col-span-2 md:grid-cols-2">
      <div>
        <p className="text-sm font-bold tracking-[0.09em] uppercase">Min Session</p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Ignore short weather windows that do not leave enough time for a session.
        </p>
      </div>
      <div className="w-full md:max-w-60 md:justify-self-end">
        <NumberStepper
          id="min-session"
          label="Minimum (hours)"
          stepperLabel="minimum session duration"
          value={draft}
          min={0.5}
          max={8}
          step={0.5}
          invalid={draft === null}
          errorId="min-session-error"
          onValueChange={setDraft}
          onValueCommitted={(next) => {
            if (next === null) return;
            const hours = Math.max(0.5, Math.min(8, Math.round(next * 2) / 2));
            setDraft(hours);
            onChange(hours);
          }}
        />
        {draft === null && (
          <p id="min-session-error" className="mt-2 text-xs text-red-700" aria-live="polite">
            Enter a session duration.
          </p>
        )}
      </div>
    </div>
  );
}
