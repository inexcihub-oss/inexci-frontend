"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import { Button, Input, OtpInput } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import {
  mfaRecoveryCodeSchema,
  mfaTotpCodeSchema,
} from "@/lib/schemas/auth.schema";
import { getApiErrorMessage } from "@/lib/http-error";

type Modo = "totp" | "recovery";

export function MfaLoginStep({
  mfaToken,
  onSubmitCode,
  onBack,
}: {
  mfaToken: string;
  onSubmitCode: (mfaToken: string, code: string) => Promise<void>;
  onBack: () => void;
}) {
  const [modo, setModo] = useState<Modo>("totp");
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
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

  const enviar = form.handleSubmit(async ({ code }) => {
    setError("");
    setIsLoading(true);
    try {
      await onSubmitCode(mfaToken, code);
    } catch (err: unknown) {
      const status = err instanceof AxiosError ? err.response?.status : null;
      if (status === 401) setExpired(true);
      setError(
        status === 429
          ? getApiErrorMessage(
              err,
              "Muitas tentativas com código inválido. Aguarde alguns minutos e tente novamente.",
            )
          : getApiErrorMessage(err, "Código inválido. Tente novamente."),
      );
      if (modo === "totp") totpForm.reset({ code: "" });
    } finally {
      setIsLoading(false);
    }
  });

  const trocarModo = () => {
    setError("");
    setModo((atual) => (atual === "totp" ? "recovery" : "totp"));
  };

  const totpField = totpForm.getFieldProps("code");
  const { name: _recoveryName, ...recoveryProps } =
    recoveryForm.getFieldProps("code");

  return (
    <form
      noValidate
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        void enviar(event);
      }}
      className="mt-8 space-y-6"
    >
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Verificação em duas etapas
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          {modo === "totp"
            ? "Digite o código de 6 dígitos do seu aplicativo autenticador."
            : "Digite um dos códigos de recuperação que você guardou."}
        </p>
      </div>

      {modo === "totp" ? (
        <OtpInput
          label="Código do aplicativo"
          autoFocus
          disabled={isLoading || expired}
          name={totpField.name}
          value={totpField.value}
          onChange={totpField.onChange}
          error={totpField.error}
        />
      ) : (
        <Input
          id="recovery-code"
          label="Código de recuperação"
          autoComplete="one-time-code"
          placeholder="XXXXX-XXXXX"
          autoFocus
          disabled={isLoading || expired}
          className="min-h-[48px] font-mono uppercase tracking-wider"
          {...recoveryProps}
        />
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {expired ? (
        <Button
          type="button"
          onClick={onBack}
          className="w-full text-sm font-semibold min-h-[48px]"
        >
          Voltar ao login
        </Button>
      ) : (
        <Button
          type="submit"
          isLoading={isLoading}
          className="w-full text-sm font-semibold min-h-[48px]"
        >
          Verificar
        </Button>
      )}

      <div className="flex flex-col gap-3 text-center text-sm">
        {!expired && (
          <button
            type="button"
            onClick={trocarModo}
            className="font-semibold text-teal-600 hover:text-teal-700"
          >
            {modo === "totp"
              ? "Usar código de recuperação"
              : "Usar código do aplicativo"}
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800"
        >
          Entrar com outra conta
        </button>
      </div>
    </form>
  );
}
