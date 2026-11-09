"use client";

import { useState } from "react";
import { ArrowLeft, LifeBuoy, ShieldCheck } from "lucide-react";
import { Button, OtpInput } from "@/components/ui";
import { formatarCodigoRecuperacao } from "@/components/auth/MfaLoginStep";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useZodForm } from "@/hooks/useZodForm";
import {
  mfaRecoveryCodeSchema,
  mfaTotpCodeSchema,
} from "@/lib/schemas/auth.schema";
import { cn } from "@/lib/utils";
import { AuthAlert } from "./AdminAuthShell";
import { codeErrorMessage, isStepExpired } from "./admin-auth-errors";

type Modo = "totp" | "recovery";

export function AdminMfaCodeForm({
  mfaToken,
  onExpired,
  onBack,
}: {
  mfaToken: string;
  onExpired: () => void;
  onBack: () => void;
}) {
  const { verifyMfa } = useAdminAuth();
  const [modo, setModo] = useState<Modo>("totp");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const totpForm = useZodForm({
    schema: mfaTotpCodeSchema,
    initialValues: { code: "" },
  });
  const recoveryForm = useZodForm({
    schema: mfaRecoveryCodeSchema,
    initialValues: { code: "" },
  });
  const form = modo === "totp" ? totpForm : recoveryForm;

  const submit = form.handleSubmit(async ({ code }) => {
    setError("");
    setIsLoading(true);
    try {
      await verifyMfa(mfaToken, code);
    } catch (err: unknown) {
      if (isStepExpired(err)) {
        onExpired();
        return;
      }
      setError(codeErrorMessage(err));
      if (modo === "totp") totpForm.reset({ code: "" });
    } finally {
      setIsLoading(false);
    }
  });

  const trocarModo = (proximo: Modo) => {
    setError("");
    setModo(proximo);
  };

  const totpField = totpForm.getFieldProps("code");
  const recoveryField = recoveryForm.getFieldProps("code");
  const Icone = modo === "totp" ? ShieldCheck : LifeBuoy;

  return (
    <form
      noValidate
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(event);
      }}
      className="space-y-6"
    >
      {modo === "recovery" && (
        <button
          type="button"
          onClick={() => trocarModo("totp")}
          className="-mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Usar código do aplicativo
        </button>
      )}

      <div className="flex flex-col items-center text-center">
        <span
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl",
            modo === "totp"
              ? "bg-teal-50 text-teal-600"
              : "bg-amber-50 text-amber-600",
          )}
        >
          <Icone className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-4 font-urbanist text-xl font-semibold text-gray-900 sm:text-2xl">
          {modo === "totp"
            ? "Verificação em duas etapas"
            : "Entrar com código de recuperação"}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-gray-600">
          {modo === "totp"
            ? "Abra seu aplicativo autenticador e digite o código de 6 dígitos."
            : "Use um dos códigos que você guardou ao cadastrar a verificação. Cada um vale uma única vez."}
        </p>
      </div>

      {modo === "totp" ? (
        <fieldset>
          <legend className="sr-only">Código do aplicativo</legend>
          <OtpInput
            autoFocus
            disabled={isLoading}
            name={totpField.name}
            value={totpField.value}
            onChange={totpField.onChange}
            error={totpField.error}
          />
        </fieldset>
      ) : (
        <div className="space-y-2">
          <label htmlFor="admin-recovery-code" className="sr-only">
            Código de recuperação
          </label>
          <input
            id="admin-recovery-code"
            name={recoveryField.name}
            type="text"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            maxLength={11}
            placeholder="XXXXX-XXXXX"
            disabled={isLoading}
            value={recoveryField.value}
            onChange={(event) =>
              recoveryForm.setField(
                "code",
                formatarCodigoRecuperacao(event.target.value),
              )
            }
            aria-invalid={recoveryField.error ? true : undefined}
            aria-describedby={
              recoveryField.error ? "admin-recovery-code-error" : undefined
            }
            className={cn(
              "h-14 w-full rounded-xl border bg-white px-4 text-center font-mono text-xl font-semibold uppercase tracking-[0.2em] text-gray-900 outline-none transition-all",
              "placeholder:text-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20",
              "disabled:cursor-not-allowed disabled:opacity-50",
              recoveryField.error
                ? "border-red-500 focus:ring-red-500/20"
                : "border-gray-200",
            )}
          />
          {recoveryField.error && (
            <p
              id="admin-recovery-code-error"
              className="text-center text-xs text-red-600 md:text-sm"
            >
              {recoveryField.error}
            </p>
          )}
        </div>
      )}

      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <Button
        type="submit"
        isLoading={isLoading}
        className="min-h-[48px] w-full text-sm font-semibold"
      >
        {modo === "totp" ? "Verificar" : "Verificar e entrar"}
      </Button>

      <div className="flex flex-col items-center gap-3 border-t border-gray-200 pt-5 text-sm">
        {modo === "totp" && (
          <p className="text-gray-600">
            Sem acesso ao aplicativo?{" "}
            <button
              type="button"
              onClick={() => trocarModo("recovery")}
              className="font-semibold text-teal-600 hover:text-teal-700"
            >
              Usar código de recuperação
            </button>
          </p>
        )}
        <button
          type="button"
          onClick={onBack}
          className="text-gray-500 hover:text-gray-800"
        >
          Entrar com outra conta
        </button>
      </div>
    </form>
  );
}
