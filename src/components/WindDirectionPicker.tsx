import { Fragment } from "react";
import { cn } from "@/lib/utils";
import {
  WIND_DIRECTIONS,
  canonicalizeWindDirections,
  type WindDirection,
} from "@shared/wind-directions";

const DIRECTIONS = [
  { value: "NW", label: "Northwest", position: "col-start-1 row-start-1", rotation: "rotate-135" },
  { value: "N", label: "North", position: "col-start-2 row-start-1", rotation: "rotate-180" },
  { value: "NE", label: "Northeast", position: "col-start-3 row-start-1", rotation: "rotate-225" },
  { value: "W", label: "West", position: "col-start-1 row-start-2", rotation: "rotate-90" },
  { value: "E", label: "East", position: "col-start-3 row-start-2", rotation: "-rotate-90" },
  { value: "SW", label: "Southwest", position: "col-start-1 row-start-3", rotation: "rotate-45" },
  { value: "S", label: "South", position: "col-start-2 row-start-3", rotation: "" },
  { value: "SE", label: "Southeast", position: "col-start-3 row-start-3", rotation: "-rotate-45" },
] as const satisfies readonly {
  value: WindDirection;
  label: string;
  position: string;
  rotation: string;
}[];

interface WindDirectionPickerProps {
  value: WindDirection[];
  onChange: (directions: WindDirection[]) => void;
}

export function WindDirectionPicker({ value, onChange }: WindDirectionPickerProps) {
  const selected = new Set(value);
  const allSelected = selected.size === WIND_DIRECTIONS.length;

  const toggle = (direction: WindDirection) => {
    if (selected.has(direction)) {
      if (selected.size === 1) return;
      selected.delete(direction);
    } else {
      selected.add(direction);
    }
    onChange(canonicalizeWindDirections([...selected]));
  };

  return (
    <fieldset className="mt-1">
      <legend className="text-xs font-bold tracking-[0.08em] uppercase">Wind from</legend>
      <div className="mt-2 grid w-fit grid-cols-3 grid-rows-3 gap-1.5">
        {DIRECTIONS.map(({ value: direction, label, position, rotation }) => {
          const isSelected = selected.has(direction);
          return (
            <Fragment key={direction}>
              {direction === "E" && (
                <button
                  type="button"
                  aria-label="Select all wind directions"
                  aria-pressed={allSelected}
                  disabled={allSelected}
                  onClick={() => onChange([...WIND_DIRECTIONS])}
                  className="col-start-2 row-start-2 size-12 rounded-full border-2 border-foreground bg-secondary text-xs font-bold text-secondary-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
                >
                  All
                </button>
              )}
              <button
                type="button"
                aria-label={label}
                aria-pressed={isSelected}
                disabled={isSelected && selected.size === 1}
                onClick={() => toggle(direction)}
                className={cn(
                  "flex size-12 flex-col items-center justify-center rounded-sm border-2 border-foreground/35 text-[0.65rem] font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60",
                  position,
                  isSelected
                    ? "border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0_var(--foreground)]"
                    : "bg-background/30 text-foreground hover:bg-primary/15",
                )}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-5", rotation)}>
                  <path
                    d="M12 3 18 10h-3v11H9V10H6Z"
                    fill={isSelected ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
                {direction}
              </button>
            </Fragment>
          );
        })}
      </div>
      <p className="mt-2 max-w-64 text-xs leading-relaxed text-muted-foreground">
        Applies to all selected spots. Direction means where the wind comes from.
      </p>
    </fieldset>
  );
}
