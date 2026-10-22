import { useEffect, useRef, useState } from "react";
import { NumberStepper } from "./NumberStepper";

interface MinSessionFieldProps {
  value: number;
  onChange: (value: number) => void;
}

export function MinSessionField({ value, onChange }: MinSessionFieldProps) {
  const [draft, setDraft] = useState<number | null>(value);
  const [custom, setCustom] = useState(![1, 2, 3].includes(value));
  const pendingCustomValue = useRef<number | null>(null);

  useEffect(() => {
    setDraft(value);
    if (![1, 2, 3].includes(value)) setCustom(true);
    else if (pendingCustomValue.current === value) pendingCustomValue.current = null;
    else setCustom(false);
  }, [value]);

  const selectPreset = (hours: number) => {
    setCustom(false);
    setDraft(hours);
    onChange(hours);
  };

  return (
    <div className="grid grid-cols-1 items-start gap-3 border-b-2 border-foreground/20 py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5 sm:py-5">
      <div>
        <p className="text-sm font-bold tracking-[0.09em] uppercase">Min Session</p>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Minimum session length">
          {[1, 2, 3].map((hours) => (
            <button
              key={hours}
              type="button"
              aria-pressed={!custom && draft === hours}
              onClick={() => selectPreset(hours)}
              className={`min-h-11 rounded-sm border-2 px-3 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${!custom && draft === hours ? "border-primary bg-primary text-primary-foreground" : "border-input bg-transparent text-foreground hover:bg-accent"}`}
            >
              {hours} hour{hours > 1 ? "s" : ""}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={custom}
            onClick={() => setCustom(true)}
            className={`min-h-11 rounded-sm border-2 px-3 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${custom ? "border-primary bg-primary text-primary-foreground" : "border-input bg-transparent text-foreground hover:bg-accent"}`}
          >
            Custom
          </button>
        </div>
        {custom && (
          <div className="mt-3 max-w-60">
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
                pendingCustomValue.current = hours;
                onChange(hours);
              }}
            />
            {draft === null && (
              <p id="min-session-error" className="mt-2 text-xs text-red-700" aria-live="polite">
                Enter a session duration.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
