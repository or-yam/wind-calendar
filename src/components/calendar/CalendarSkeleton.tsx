import { Skeleton } from "@/components/ui/skeleton";

export function CalendarSkeleton({ dayCount }: { dayCount: number }) {
  return (
    <div
      role="region"
      aria-label="Weekly forecast calendar"
      aria-busy="true"
      className="overflow-hidden rounded border border-border bg-card"
    >
      <div
        aria-hidden="true"
        className="grid"
        style={{ gridTemplateColumns: `40px repeat(${dayCount}, minmax(0, 1fr))` }}
      >
        <div />
        {Array.from({ length: dayCount }, (_, i) => (
          <div key={i} className="border-l border-border">
            <div className="flex h-16 items-center justify-center border-b border-border">
              <Skeleton className="h-8 w-8" />
            </div>
            <div
              className="relative h-[504px]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0, transparent 35px, var(--border) 35px, var(--border) 36px)",
              }}
            >
              <Skeleton
                className="absolute inset-x-1 h-[108px]"
                style={{ top: 72 + (i % 3) * 36 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
