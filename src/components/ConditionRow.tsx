import type { ReactNode } from "react";

export function ConditionRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-3 border-b-2 border-foreground/20 py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5 sm:py-5">
      {children}
    </div>
  );
}
