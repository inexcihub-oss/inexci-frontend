import { ChangeEvent, InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { applyMask, MaskKind } from "@/lib/masks";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /**
   * Quando definida, intercepta o `onChange` aplicando a máscara
   * antes de chamar o handler do consumidor. O valor entregue ao
   * `onChange` (e mantido no input) já vem mascarado.
   *
   * Use `unmask()` antes de enviar ao backend.
   */
  mask?: MaskKind;
}

const INPUT_MODE_BY_MASK: Record<MaskKind, InputHTMLAttributes<HTMLInputElement>["inputMode"]> = {
  cpf: "numeric",
  cnpj: "numeric",
  cpfCnpj: "numeric",
  phone: "tel",
  cep: "numeric",
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, type = "text", mask, onChange, inputMode, ...props },
    ref,
  ) => {
    const handleChange = mask
      ? (e: ChangeEvent<HTMLInputElement>) => {
          const masked = applyMask(mask, e.target.value);
          if (masked !== e.target.value) {
            e.target.value = masked;
          }
          onChange?.(e);
        }
      : onChange;

    const computedInputMode = inputMode ?? (mask ? INPUT_MODE_BY_MASK[mask] : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={props.id} className="ds-label">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          type={type}
          inputMode={computedInputMode}
          className={cn(
            "ds-input",
            error && "border-red-500 focus:ring-red-500",
            className,
          )}
          ref={ref}
          onChange={handleChange}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs md:text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
