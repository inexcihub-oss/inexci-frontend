"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import { useZodForm } from "@/hooks/useZodForm";
import { mfaDisableSchema } from "@/lib/schemas/auth.schema";
import { getApiErrorMessage } from "@/lib/http-error";
import { mfaService } from "@/services/mfa.service";

export function MfaDisableModal({
  isOpen,
  onClose,
  onDisabled,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDisabled: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const form = useZodForm({
    schema: mfaDisableSchema,
    initialValues: { password: "", code: "" },
  });
  const { reset } = form;

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    reset({ password: "", code: "" });
  }, [isOpen, reset]);

  const handleSubmit = form.handleSubmit(async ({ password, code }) => {
    setSubmitting(true);
    setError("");
    try {
      await mfaService.disable(password, code);
      onDisabled();
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          "Não foi possível desativar. Confira a senha e o código.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  });

  const passwordField = form.getFieldProps("password");
  const codeField = form.getFieldProps("code");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Desativar verificação em duas etapas"
      disableClose={submitting}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(event);
        }}
      >
        <div className="space-y-4 px-4 py-4 md:px-6 md:py-6">
          <p className="text-sm text-gray-700">
            Sua conta ficará protegida só pela senha. As sessões abertas em
            outros dispositivos serão encerradas.
          </p>
          <PasswordInput
            label="Senha atual"
            aria-label="Senha atual"
            autoComplete="current-password"
            disabled={submitting}
            {...passwordField}
          />
          <Input
            label="Código do aplicativo ou de recuperação"
            autoComplete="one-time-code"
            placeholder="123456 ou XXXXX-XXXXX"
            disabled={submitting}
            {...codeField}
          />
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
        <ModalFooter>
          <SpinnerButton variant="secondary" onClick={onClose}>
            Cancelar
          </SpinnerButton>
          <SpinnerButton
            type="submit"
            variant="danger"
            isLoading={submitting}
            loadingText="Desativando..."
          >
            Desativar
          </SpinnerButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}
