"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import PasswordInput from "@/components/ui/PasswordInput";
import type { ToastType } from "@/types/toast.types";
import { authService } from "@/services/auth.service";
import { changePasswordSchema } from "@/lib/schemas/configuracoes.schema";
import { summarizeErrors } from "@/lib/form-errors";
import { getApiErrorMessage } from "@/lib/http-error";
import { isMfaChallenge } from "@/types";
import { issuesToFieldErrors } from "./SettingsControls";

const PASSWORD_FIELD_LABELS: Record<string, string> = {
  currentPassword: "Senha atual",
  newPassword: "Nova senha",
  confirmPassword: "Confirmar nova senha",
};

const EMPTY_PASSWORD = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

async function renovarSessao(
  email: string | undefined,
  password: string,
): Promise<boolean> {
  if (!email) return false;
  try {
    const response = await authService.login({ email, password });
    return !isMfaChallenge(response);
  } catch {
    return false;
  }
}

export function ChangePasswordModal({
  isOpen,
  email,
  onClose,
  showToast,
}: {
  isOpen: boolean;
  email?: string;
  onClose: () => void;
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [passwordData, setPasswordData] = useState(EMPTY_PASSWORD);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {},
  );

  const fechar = () => {
    setPasswordData(EMPTY_PASSWORD);
    setPasswordErrors({});
    onClose();
  };

  const updatePasswordField = (
    field: keyof typeof passwordData,
    value: string,
  ) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors((prev) => {
        const { [field]: _omit, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleChangePassword = async () => {
    const result = changePasswordSchema.safeParse(passwordData);
    if (!result.success) {
      const errs = issuesToFieldErrors(result.error.issues);
      setPasswordErrors(errs);
      showToast(summarizeErrors(errs, PASSWORD_FIELD_LABELS), "error");
      return;
    }
    setPasswordErrors({});
    setSaving(true);
    try {
      await authService.updatePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
      );
      const sessaoRenovada = await renovarSessao(
        email,
        passwordData.newPassword,
      );
      showToast(
        sessaoRenovada
          ? "Senha alterada com sucesso! As outras sessões foram encerradas."
          : "Senha alterada com sucesso! Faça login novamente.",
        "success",
      );
      fechar();
    } catch (error: unknown) {
      showToast(getApiErrorMessage(error, "Erro ao alterar senha"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={fechar}
      title="Alterar senha"
      disableClose={saving}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleChangePassword();
        }}
      >
        <div className="space-y-4 px-4 py-4 md:px-6 md:py-6">
          <PasswordInput
            label="Senha atual"
            autoComplete="current-password"
            value={passwordData.currentPassword}
            onChange={(e) =>
              updatePasswordField("currentPassword", e.target.value)
            }
            required
            disabled={saving}
            error={passwordErrors.currentPassword}
          />
          <PasswordInput
            label="Nova senha"
            autoComplete="new-password"
            showRequirements
            value={passwordData.newPassword}
            onChange={(e) => updatePasswordField("newPassword", e.target.value)}
            required
            disabled={saving}
            error={passwordErrors.newPassword}
          />
          <PasswordInput
            label="Confirmar nova senha"
            autoComplete="new-password"
            value={passwordData.confirmPassword}
            onChange={(e) =>
              updatePasswordField("confirmPassword", e.target.value)
            }
            required
            disabled={saving}
            error={passwordErrors.confirmPassword}
          />
          <p className="text-xs text-gray-500">
            Ao trocar a senha, as sessões abertas em outros dispositivos são
            encerradas.
          </p>
        </div>
        <ModalFooter>
          <SpinnerButton variant="secondary" onClick={fechar}>
            Cancelar
          </SpinnerButton>
          <SpinnerButton
            type="submit"
            isLoading={saving}
            loadingText="Salvando..."
          >
            Salvar nova senha
          </SpinnerButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}
