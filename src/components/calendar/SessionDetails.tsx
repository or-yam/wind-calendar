import { useLayoutEffect, useRef } from "react";
import type { ForecastSession } from "@shared/forecast-types";
import { formatTimeFromDate } from "@/lib/date-utils";
import { DirectionIndicator } from "./DirectionIndicator";

const timestamp = (value: string) => {
  const date = new Date(value);
  return `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${formatTimeFromDate(date)}`;
};

const sameCalendarDay = (start: string, end: string) =>
  new Date(start).toDateString() === new Date(end).toDateString();

export function SessionDetails({
  session,
  id,
  onClose,
}: {
  session: ForecastSession;
  id: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current?.focus();
  }, [session.location.id, session.start, session.end, session.matchType]);
  const { wind, wave, swell } = session;
  return (
    <div
      ref={ref}
      id={id}
      role="region"
      aria-label="Session details"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      className="relative mt-3 rounded border border-border border-l-3 border-l-primary bg-card p-4 pr-14 text-sm text-card-foreground focus-visible:outline-2 focus-visible:outline-primary"
    >
      <h3 className="text-lg font-bold">{session.location.label}</h3>
      <p className="text-muted-foreground">
        {timestamp(session.start)} –{" "}
        {sameCalendarDay(session.start, session.end)
          ? formatTimeFromDate(new Date(session.end))
          : timestamp(session.end)}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {session.matchType !== "wave" && (
          <p>
            Wind {wind.min === wind.max ? wind.min : `${wind.min}–${wind.max}`} kn · Gusts{" "}
            {wind.gustMax} kn <DirectionIndicator direction={wind.direction} label="Wind" />
          </p>
        )}
        {session.matchType !== "wind" && (
          <>
            <p>
              Wave {wave.avgHeight.toFixed(1)}m{wave.avgPeriod > 0 ? ` ${wave.avgPeriod}s` : ""}{" "}
              <DirectionIndicator direction={wave.direction} label="Wave" wave />
            </p>
            <p>
              Swell {swell.avgHeight.toFixed(1)}m{swell.avgPeriod > 0 ? ` ${swell.avgPeriod}s` : ""}
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        aria-label="Close session details"
        onClick={onClose}
        className="absolute top-1 right-1 flex size-11 items-center justify-center rounded text-xl focus-visible:outline-2 focus-visible:outline-primary"
      >
        ×
      </button>
    </div>
  );
}
