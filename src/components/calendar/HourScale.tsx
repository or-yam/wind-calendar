export function HourScale({
  startHour,
  endHour,
  hourHeight,
}: {
  startHour: number;
  endHour: number;
  hourHeight: number;
}) {
  return (
    <div
      className="relative mt-16 text-xs tabular-nums text-muted-foreground"
      aria-label="Local clock hours"
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
          {`${String(startHour + index).padStart(2, "0")}:00`}
        </span>
      ))}
    </div>
  );
}
