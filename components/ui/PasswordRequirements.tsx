"use client";

import { Check, X } from "lucide-react";
import { passwordChecks } from "@/lib/validators";
import { cn } from "@/lib/utils";

export interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

const REQUIREMENTS: Array<{
  key: keyof ReturnType<typeof passwordChecks>;
  label: string;
}> = [
  { key: "minLength", label: "Pelo menos 8 caracteres" },
  { key: "hasUpper", label: "Pelo menos 1 letra maiúscula" },
  { key: "hasLower", label: "Pelo menos 1 letra minúscula" },
  { key: "hasNumber", label: "Pelo menos 1 número" },
  { key: "hasSpecial", label: "Pelo menos 1 caractere especial" },
];

export function PasswordRequirements({
  password,
  className,
}: PasswordRequirementsProps) {
  const checks = passwordChecks(password);

  return (
    <ul
      className={cn("mt-2 space-y-1", className)}
      aria-label="Requisitos da senha"
      data-testid="password-requirements"
    >
      {REQUIREMENTS.map((req) => {
        const ok = checks[req.key];
        return (
          <li
            key={req.key}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              ok ? "text-green-600" : "text-gray-500",
            )}
            data-ok={ok}
            data-key={req.key}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
                ok
                  ? "border-green-500 bg-green-50 text-green-600"
                  : "border-gray-300 bg-white text-gray-400",
              )}
              aria-hidden="true"
            >
              {ok ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : (
                <X className="h-3 w-3" strokeWidth={3} />
              )}
            </span>
            <span>{req.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default PasswordRequirements;
