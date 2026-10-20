"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { OtpInput } from "@/components/ui/OtpInput";
import { useZodForm } from "@/hooks/useZodForm";
import { mfaTotpCodeSchema } from "@/lib/schemas/auth.schema";
import { getApiErrorMessage } from "@/lib/http-error";
import { mfaService } from "@/services/mfa.service";
import { RecoveryCodesPanel } from "./RecoveryCodesPanel";

export function MfaRecoveryCodesModal({
  isOpen,
  email,
  onClose,
}: {
  isOpen: boolean;
  email?: string | null;
  onClose: () => void;
}) {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useZodForm({
    schema: mfaTotpCodeSchema,
    initialValues: { code: "" },
  });
  const { reset } = form;

  useEffect(() => {
    if (!isOpen) return;
    setCodes(null);
    reset({ code: "" });
  }, [isOpen, reset]);

  const handleSubmit = form.handleSubmit(async ({ code }) => {
    setSubmitting(true);
    try {
      const result = await mfaService.regenerateRecoveryCodes(code);
      setCodes(result.recoveryCodes);
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
      title="Gerar novos códigos de recuperação"
      disableClose={submitting}
    >
      {codes ? (
        <>
          <div className="space-y-4 px-4 py-4 md:px-6 md:py-6">
            <p className="text-sm text-gray-700">
              Os códigos anteriores deixaram de valer.
            </p>
            <RecoveryCodesPanel codes={codes} email={email} />
          </div>
          <ModalFooter align="end">
            <SpinnerButton onClick={onClose}>Concluir</SpinnerButton>
          </ModalFooter>
        </>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit(event);
          }}
        >
          <div className="space-y-4 px-4 py-4 md:px-6 md:py-6">
            <p className="text-sm text-gray-700">
              Os códigos atuais deixarão de valer. Para confirmar, digite o
              código do aplicativo autenticador.
            </p>
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
              loadingText="Gerando..."
            >
              Gerar novos códigos
            </SpinnerButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
