"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { adminService } from "@/services/admin.service";
import { useSubscriptionAction } from "@/components/admin/accounts/subscription/useSubscriptionAction";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function NewAdminModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutation, serverError, clearError } = useSubscriptionAction(
    () =>
      adminService.createTeamMember({
        name: name.trim(),
        email: email.trim().toLowerCase(),
      }),
    "Convite enviado.",
    onClose,
  );

  const nameError =
    submitted && name.trim().length < 2 ? "Informe o nome." : undefined;
  const emailError =
    submitted && !EMAIL_RE.test(email.trim())
      ? "Informe um e-mail válido."
      : undefined;

  const handleConfirm = () => {
    setSubmitted(true);
    if (name.trim().length < 2 || !EMAIL_RE.test(email.trim())) return;
    mutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo administrador"
      size="sm"
      disableClose={mutation.isPending}
      footer={
        <ModalFooter align="end">
          <SpinnerButton
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </SpinnerButton>
          <SpinnerButton
            onClick={handleConfirm}
            isLoading={mutation.isPending}
            loadingText="Enviando..."
          >
            Enviar convite
          </SpinnerButton>
        </ModalFooter>
      }
    >
      <div className="space-y-4 p-4 md:p-6">
        <Input
          label="Nome"
          value={name}
          error={nameError}
          onChange={(e) => {
            clearError();
            setName(e.target.value);
          }}
        />
        <Input
          label="E-mail"
          type="email"
          value={email}
          error={emailError}
          onChange={(e) => {
            clearError();
            setEmail(e.target.value);
          }}
        />
        <p className="text-xs text-gray-500">
          A pessoa recebe um e-mail para definir a senha e precisa ativar o MFA
          no primeiro acesso.
        </p>
        {serverError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {serverError}
          </div>
        )}
      </div>
    </Modal>
  );
}
