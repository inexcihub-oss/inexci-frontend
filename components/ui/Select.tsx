import { forwardRef, SelectHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    // Sem `id` vindo de fora, gera um para ligar o <label> ao <select> —
    // senão leitor de tela e `getByLabelText` não encontram o campo.
    const generatedId = useId();
    const selectId = id ?? generatedId;
    return (
      <div className="w-full">
        {label && (
          <label className="ds-label" htmlFor={selectId}>
            {label}
            {props.required && (
              <span className="text-red-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative w-full">
          <select
            className={cn(
              // A seta vem do `select.ds-input` em globals.css.
              "ds-input",
              error && "border-red-500 focus:ring-red-500",
              className,
            )}
            ref={ref}
            id={selectId}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
