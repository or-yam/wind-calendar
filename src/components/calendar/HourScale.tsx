export function HourScale({
  startHour,
  endHour,
  hourHeight,
  elapsedAxis,
}: {
  startHour: number;
  endHour: number;
  hourHeight: number;
  elapsedAxis: boolean;
}) {
  return (
    <div
      className="relative mt-16 text-xs tabular-nums text-muted-foreground"
      aria-label={elapsedAxis ? "Elapsed hours since local midnight" : "Local clock hours"}
    >
      {Array.from({ length: endHour - startHour + 1 }, (_, index) => (
        <span
          key={index}
          className="absolute right-1"
          style={{
            top: index * hourHeight,
            transform: index === endHour - startHour ? "translateY(-100%)" : undefined,
          }}
        >
          {elapsedAxis
            ? `${String(startHour + index).padStart(2, "0")}h`
            : `${String(startHour + index).padStart(2, "0")}:00`}
        </span>
      ))}
    </div>
  );
}
