"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShieldPlus } from "lucide-react";
import { Button, OtpInput } from "@/components/ui";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useZodForm } from "@/hooks/useZodForm";
import { mfaTotpCodeSchema } from "@/lib/schemas/auth.schema";
import type { AdminMfaSetup } from "@/services/admin-auth.service";
import { AuthAlert } from "./AdminAuthShell";
import {
  codeErrorMessage,
  isStepExpired,
  responseMessage,
} from "./admin-auth-errors";

export function AdminMfaSetupForm({
  setupToken,
  onEnabled,
  onExpired,
  onBack,
}: {
  setupToken: string;
  onEnabled: (recoveryCodes: string[]) => void;
  onExpired: () => void;
  onBack: () => void;
}) {
  const { startMfaSetup, enableMfa } = useAdminAuth();
  const [setup, setSetup] = useState<AdminMfaSetup | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const form = useZodForm({
    schema: mfaTotpCodeSchema,
    initialValues: { code: "" },
  });

  useEffect(() => {
    let active = true;
    startMfaSetup(setupToken)
      .then((data) => {
        if (active) setSetup(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (isStepExpired(err)) {
          onExpired();
          return;
        }
        setLoadError(
          responseMessage(
            err,
            "Não foi possível iniciar o cadastro da verificação. Tente novamente.",
          ),
        );
      });
    return () => {
      active = false;
    };
  }, [setupToken, startMfaSetup, onExpired]);

  const submit = form.handleSubmit(async ({ code }) => {
    setError("");
    setIsLoading(true);
    try {
      await enableMfa(setupToken, code, onEnabled);
    } catch (err: unknown) {
      if (isStepExpired(err)) {
        onExpired();
        return;
      }
      setError(codeErrorMessage(err));
      form.reset({ code: "" });
    } finally {
      setIsLoading(false);
    }
  });

  const codeField = form.getFieldProps("code");

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
          <ShieldPlus className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-4 font-urbanist text-xl font-semibold text-gray-900 sm:text-2xl">
          Cadastre a verificação em duas etapas
        </h1>
        <p className="mt-2 max-w-sm text-sm text-gray-600">
          O painel exige um aplicativo autenticador. Faça o cadastro uma vez e
          use o código dele a cada login.
        </p>
      </div>

      {loadError ? (
        <div className="space-y-4">
          <AuthAlert tone="error">{loadError}</AuthAlert>
          <Button
            type="button"
            onClick={onBack}
            className="min-h-[48px] w-full text-sm font-semibold"
          >
            Voltar ao login
          </Button>
        </div>
      ) : !setup ? (
        <p className="text-center text-sm text-gray-600">
          Gerando sua chave...
        </p>
      ) : (
        <form
          noValidate
          method="post"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(event);
          }}
          className="space-y-6"
        >
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row">
            <div className="shrink-0 rounded-xl border border-gray-200 bg-white p-2.5">
              <QRCodeSVG
                value={setup.otpauthUri}
                size={144}
                level="M"
                role="img"
                aria-label="QR code para configurar o aplicativo autenticador"
                data-testid="admin-mfa-qrcode"
              />
            </div>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700">
              <li>
                Abra um aplicativo autenticador (Google Authenticator, Microsoft
                Authenticator, 1Password, Authy...).
              </li>
              <li>Escaneie o QR code.</li>
              <li>Digite abaixo o código de 6 dígitos que ele mostrar.</li>
            </ol>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="text-gray-600">
              Não consegue ler o QR code? Adicione a conta manualmente com a
              chave abaixo (tipo &quot;baseada em tempo&quot;).
            </p>
            <p
              data-testid="admin-mfa-secret"
              className="mt-2 break-all font-mono text-base tracking-wider text-gray-900"
            >
              {setup.formattedSecret}
            </p>
          </div>

          <OtpInput
            label="Código do aplicativo"
            disabled={isLoading}
            name={codeField.name}
            value={codeField.value}
            onChange={codeField.onChange}
            error={codeField.error}
          />

          {error && <AuthAlert tone="error">{error}</AuthAlert>}

          <Button
            type="submit"
            isLoading={isLoading}
            className="min-h-[48px] w-full text-sm font-semibold"
          >
            Ativar verificação
          </Button>

          <div className="border-t border-gray-200 pt-5 text-center text-sm">
            <button
              type="button"
              onClick={onBack}
              className="text-gray-500 hover:text-gray-800"
            >
              Entrar com outra conta
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
