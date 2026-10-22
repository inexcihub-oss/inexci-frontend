"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  Info,
  LifeBuoy,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Button, OtpInput } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import {
  mfaRecoveryCodeSchema,
  mfaTotpCodeSchema,
} from "@/lib/schemas/auth.schema";
import { getApiErrorMessage } from "@/lib/http-error";
import { cn } from "@/lib/utils";

type Modo = "totp" | "recovery";

const CONTEUDO: Record<
  Modo,
  { icon: LucideIcon; titulo: string; descricao: string }
> = {
  totp: {
    icon: ShieldCheck,
    titulo: "Verificação em duas etapas",
    descricao: "Abra seu aplicativo autenticador e digite o código de 6 dígitos.",
  },
  recovery: {
    icon: LifeBuoy,
    titulo: "Entrar com código de recuperação",
    descricao:
      "Sem acesso ao aplicativo? Use um dos códigos que você guardou ao ativar a verificação.",
  },
};

export function formatarCodigoRecuperacao(valor: string): string {
  const limpo = valor
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10);
  return limpo.length > 5 ? `${limpo.slice(0, 5)}-${limpo.slice(5)}` : limpo;
}

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

  const trocarModo = (proximo: Modo) => {
    setError("");
    setModo(proximo);
  };

  const totpField = totpForm.getFieldProps("code");
  const recoveryField = recoveryForm.getFieldProps("code");
  const { icon: Icone, titulo, descricao } = CONTEUDO[modo];

  return (
    <form
      noValidate
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        void enviar(event);
      }}
      className="space-y-6"
    >
      {modo === "recovery" && !expired && (
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
        <h2 className="mt-4 text-xl sm:text-2xl font-semibold text-gray-900 font-urbanist">
          {titulo}
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-600">{descricao}</p>
      </div>

      {modo === "totp" ? (
        <fieldset>
          <legend className="sr-only">Código do aplicativo</legend>
          <OtpInput
            autoFocus
            disabled={isLoading || expired}
            name={totpField.name}
            value={totpField.value}
            onChange={totpField.onChange}
            error={totpField.error}
          />
        </fieldset>
      ) : (
        <div className="space-y-3">
          <label htmlFor="recovery-code" className="sr-only">
            Código de recuperação
          </label>
          <input
            id="recovery-code"
            name={recoveryField.name}
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            maxLength={11}
            placeholder="XXXXX-XXXXX"
            disabled={isLoading || expired}
            value={recoveryField.value}
            onChange={(event) =>
              recoveryForm.setField(
                "code",
                formatarCodigoRecuperacao(event.target.value),
              )
            }
            aria-invalid={recoveryField.error ? true : undefined}
            aria-describedby={
              recoveryField.error ? "recovery-code-error" : undefined
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
              id="recovery-code-error"
              className="text-center text-xs md:text-sm text-red-600"
            >
              {recoveryField.error}
            </p>
          )}
          <div className="flex gap-2.5 rounded-xl border border-gray-200 bg-white p-3.5 text-left text-xs sm:text-sm text-gray-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <p>
              Cada código vale uma única vez. Depois de entrar, gere novos em{" "}
              <span className="font-medium text-gray-800">
                Configurações › Segurança
              </span>
              .
            </p>
          </div>
        </div>
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
          {modo === "totp" ? "Verificar" : "Verificar e entrar"}
        </Button>
      )}

      <div className="flex flex-col items-center gap-3 border-t border-gray-200 pt-5 text-sm">
        {modo === "totp" && !expired && (
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
