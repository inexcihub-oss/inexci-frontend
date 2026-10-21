"use client";

import Input from "@/components/ui/Input";
import { applyBRLMask } from "@/lib/currency";

interface MoneyInputProps {
  label: string;
  value: string;
  onChange: (masked: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function MoneyInput({
  label,
  value,
  onChange,
  error,
  required,
  disabled,
  id,
  name,
}: MoneyInputProps) {
  return (
    <Input
      id={id}
      name={name}
      label={label}
      inputMode="numeric"
      placeholder="R$ 0,00"
      value={value}
      required={required}
      disabled={disabled}
      error={error}
      onChange={(e) => onChange(applyBRLMask(e.target.value))}
    />
  );
}
