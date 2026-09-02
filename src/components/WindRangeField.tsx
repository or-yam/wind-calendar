import { useEffect, useState } from "react";
import { WindNumberField } from "./WindNumberField";

interface WindRangeFieldProps {
  min: number;
  max: number;
  onChange: (range: [number, number]) => void;
}

const WIND_MIN = 5;
const WIND_MAX = 50;

export function WindRangeField({ min, max, onChange }: WindRangeFieldProps) {
  const [draft, setDraft] = useState<[number | null, number | null]>([min, max]);

  useEffect(() => setDraft([min, max]), [min, max]);

  const error =
    draft[0] === null || draft[1] === null
      ? "Enter both wind speeds."
      : !Number.isInteger(draft[0]) || !Number.isInteger(draft[1])
        ? "Wind speed must be a whole number."
        : draft[0] < WIND_MIN || draft[0] > WIND_MAX || draft[1] < WIND_MIN || draft[1] > WIND_MAX
          ? `Wind speed must be between ${WIND_MIN} and ${WIND_MAX} knots.`
          : draft[0] >= draft[1]
            ? "Minimum must be at least 1 knot below maximum."
            : null;

  const commit = (index: 0 | 1, value: number | null) => {
    const next: [number | null, number | null] = [...draft];
    next[index] = value;
    setDraft(next);
    if (
      next[0] !== null &&
      next[1] !== null &&
      Number.isInteger(next[0]) &&
      Number.isInteger(next[1]) &&
      next[0] >= WIND_MIN &&
      next[1] <= WIND_MAX &&
      next[0] < next[1]
    ) {
      onChange([next[0], next[1]]);
    }
  };

  return (
    <fieldset aria-describedby={error ? "wind-range-error" : undefined}>
      <legend className="sr-only">Wind speed range in knots</legend>
      <div className="grid grid-cols-2 gap-3">
        <WindNumberField
          id="wind-min"
          label="Minimum"
          value={draft[0]}
          min={WIND_MIN}
          max={Math.max(WIND_MIN, Math.min((draft[1] ?? WIND_MAX) - 1, WIND_MAX - 1))}
          invalid={error !== null}
          onValueChange={(value) => setDraft((current) => [value, current[1]])}
          onValueCommitted={(value) => commit(0, value)}
        />
        <WindNumberField
          id="wind-max"
          label="Maximum"
          value={draft[1]}
          min={Math.min(WIND_MAX, Math.max((draft[0] ?? WIND_MIN) + 1, WIND_MIN + 1))}
          max={WIND_MAX}
          invalid={error !== null}
          onValueChange={(value) => setDraft((current) => [current[0], value])}
          onValueCommitted={(value) => commit(1, value)}
        />
      </div>
      {error && (
        <p id="wind-range-error" className="mt-2 text-xs text-red-400" aria-live="polite">
          {error}
        </p>
      )}
    </fieldset>
  );
}
