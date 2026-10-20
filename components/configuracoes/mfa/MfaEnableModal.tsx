"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { OtpInput } from "@/components/ui/OtpInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { useZodForm } from "@/hooks/useZodForm";
import { mfaTotpCodeSchema } from "@/lib/schemas/auth.schema";
import { getApiErrorMessage } from "@/lib/http-error";
import { mfaService } from "@/services/mfa.service";
import type { MfaSetupResponse } from "@/types";
import { RecoveryCodesPanel } from "./RecoveryCodesPanel";

type Etapa = "carregando" | "configurar" | "codigos" | "erro";

export function MfaEnableModal({
  isOpen,
  email,
  onClose,
  onEnabled,
}: {
  isOpen: boolean;
  email?: string | null;
  onClose: () => void;
  onEnabled: () => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [setupError, setSetupError] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useZodForm({
    schema: mfaTotpCodeSchema,
    initialValues: { code: "" },
  });
  const { reset } = form;

  useEffect(() => {
    if (!isOpen) return;
    let ativo = true;
    setEtapa("carregando");
    setSetup(null);
    setRecoveryCodes([]);
    setSaved(false);
    reset({ code: "" });
    mfaService
      .setup()
      .then((data) => {
        if (!ativo) return;
        setSetup(data);
        setEtapa("configurar");
      })
      .catch((error: unknown) => {
        if (!ativo) return;
        setSetupError(
          getApiErrorMessage(
            error,
            "Não foi possível iniciar a configuração. Tente novamente.",
          ),
        );
        setEtapa("erro");
      });
    return () => {
      ativo = false;
    };
  }, [isOpen, reset]);

  const handleEnable = form.handleSubmit(async ({ code }) => {
    setSubmitting(true);
    try {
      const { recoveryCodes: codes } = await mfaService.enable(code);
      setRecoveryCodes(codes);
      setEtapa("codigos");
      onEnabled();
    } catch (error: unknown) {
      form.setError(
        "code",
        getApiErrorMessage(error, "Código inválido. Tente novamente."),
      );
    } finally {
      setSubmitting(false);
    }
  });

  const codeField = form.getFieldProps("code");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ativar verificação em duas etapas"
      disableClose={submitting}
    >
      {etapa === "carregando" && (
        <p className="px-4 py-6 text-sm text-gray-600 md:px-6">
          Gerando sua chave...
        </p>
      )}

      {etapa === "erro" && (
        <>
          <p role="alert" className="px-4 py-6 text-sm text-red-700 md:px-6">
            {setupError}
          </p>
          <ModalFooter align="end">
            <SpinnerButton variant="secondary" onClick={onClose}>
              Fechar
            </SpinnerButton>
          </ModalFooter>
        </>
      )}

      {etapa === "configurar" && setup && (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void handleEnable(event);
          }}
        >
          <div className="space-y-5 px-4 py-4 md:px-6 md:py-6">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700">
              <li>
                Abra um aplicativo autenticador (Google Authenticator,
                Microsoft Authenticator, 1Password, Authy...).
              </li>
              <li>
                Adicione uma conta digitando a chave abaixo (tipo &quot;baseada
                em tempo&quot;).
              </li>
              <li>Digite o código de 6 dígitos que o aplicativo mostrar.</li>
            </ol>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Chave de configuração
              </p>
              <p
                data-testid="mfa-secret"
                className="mt-1 break-all font-mono text-base tracking-wider text-gray-900"
              >
                {setup.formattedSecret}
              </p>
              <a
                href={setup.otpauthUri}
                className="mt-3 inline-block text-sm font-semibold text-teal-600 hover:text-teal-700"
              >
                Abrir no aplicativo autenticador
              </a>
            </div>

            <OtpInput
              label="Código do aplicativo"
              autoFocus
              disabled={submitting}
              name={codeField.name}
              value={codeField.value}
              onChange={codeField.onChange}
              error={codeField.error}
            />
          </div>
          <ModalFooter>
            <SpinnerButton variant="secondary" onClick={onClose}>
              Cancelar
            </SpinnerButton>
            <SpinnerButton
              type="submit"
              isLoading={submitting}
              loadingText="Ativando..."
            >
              Ativar
            </SpinnerButton>
          </ModalFooter>
        </form>
      )}

      {etapa === "codigos" && (
        <>
          <div className="space-y-4 px-4 py-4 md:px-6 md:py-6">
            <p className="text-sm text-gray-700">
              Verificação em duas etapas ativada. A partir do próximo login,
              além da senha, pediremos o código do aplicativo.
            </p>
            <RecoveryCodesPanel codes={recoveryCodes} email={email} />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox
                checked={saved}
                onCheckedChange={setSaved}
                aria-label="Guardei os códigos de recuperação"
              />
              Guardei os códigos de recuperação em local seguro
            </label>
          </div>
          <ModalFooter align="end">
            <SpinnerButton onClick={onClose} disabled={!saved}>
              Concluir
            </SpinnerButton>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
