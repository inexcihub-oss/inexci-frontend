"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { className, checked = false, onCheckedChange, indeterminate, ...props },
    ref,
  ) => {
    const handleClick = () => {
      if (!props.disabled) {
        onCheckedChange?.(!checked);
      }
    };

    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        onClick={handleClick}
        disabled={props.disabled}
        className={cn(
          "peer h-5 w-5 shrink-0 rounded border-[1.5px] transition-all duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25b4b0] focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked || indeterminate
            ? "border-[#25b4b0] bg-[#25b4b0]"
            : "border-gray-400 bg-white hover:border-[#25b4b0]",
          className,
        )}
      >
        {(checked || indeterminate) && (
          <div className="flex items-center justify-center text-white">
            {indeterminate ? (
              <div className="h-0.5 w-2.5 bg-white rounded" />
            ) : (
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            )}
          </div>
        )}
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={() => {}}
          className="sr-only"
          {...props}
        />
      </button>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
