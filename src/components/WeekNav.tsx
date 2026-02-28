import { formatWeekRange } from "../lib/date-utils";

interface WeekNavProps {
  weekStart: Date;
  weekStartsOnSunday: boolean;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleWeekStart: (startOnSunday: boolean) => void;
}

export function WeekNav({
  weekStart,
  weekStartsOnSunday,
  onToday,
  onPrev,
  onNext,
  onToggleWeekStart,
}: WeekNavProps) {
  return (
    <div className="nav-bar">
      <button className="btn-nav" onClick={onToday}>
        Today
      </button>
      <button className="btn-nav-arrow" onClick={onPrev}>
        ‹
      </button>
      <button className="btn-nav-arrow" onClick={onNext}>
        ›
      </button>
      <div className="nav-title">{formatWeekRange(weekStart)}</div>
      <div className="week-start-toggle">
        <button
          className={`btn-nav ${!weekStartsOnSunday ? "active" : ""}`}
          onClick={() => onToggleWeekStart(false)}
        >
          Mon
        </button>
        <button
          className={`btn-nav ${weekStartsOnSunday ? "active" : ""}`}
          onClick={() => onToggleWeekStart(true)}
        >
          Sun
        </button>
      </div>
    </div>
  );
}
