import { LoaderIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Spinner({ className, "aria-label": ariaLabel, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderIcon
      role="status"
      aria-label={ariaLabel}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
