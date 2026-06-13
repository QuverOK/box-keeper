import * as React from "react";

import { Input } from "./input";
import { cn } from "./utils";

type UnitInputProps = React.ComponentProps<typeof Input> & {
  unit: string;
};

const UnitInput = React.forwardRef<HTMLInputElement, UnitInputProps>(
  ({ unit, className, ...props }, ref) => {
    return (
      <div className="relative">
        <Input ref={ref} className={cn("pr-9", className)} {...props} />
        <span
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none"
          aria-hidden
        >
          {unit}
        </span>
      </div>
    );
  },
);
UnitInput.displayName = "UnitInput";

export { UnitInput };
