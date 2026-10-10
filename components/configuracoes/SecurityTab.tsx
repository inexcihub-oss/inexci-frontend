"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PasswordInput from "@/components/ui/PasswordInput";
import type { ToastType } from "@/types/toast.types";
import { authService } from "@/services/auth.service";
import { changePasswordSchema } from "@/lib/schemas/configuracoes.schema";
import { summarizeErrors } from "@/lib/form-errors";
import { getApiErrorMessage } from "@/lib/http-error";
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

export function SecurityTab({
  showToast,
}: {
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [passwordData, setPasswordData] = useState(EMPTY_PASSWORD);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {},
  );

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
      showToast("Senha alterada com sucesso!", "success");
      setPasswordData(EMPTY_PASSWORD);
    } catch (error: unknown) {
      showToast(getApiErrorMessage(error, "Erro ao alterar senha"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 rounded-2xl">
        <CardHeader className="p-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Alterar Senha
          </h3>
          <p className="text-sm text-gray-500">
            Mantenha sua conta segura com uma senha forte
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="space-y-4 max-w-md">
            <PasswordInput
              label="Senha atual"
              value={passwordData.currentPassword}
              onChange={(e) =>
                updatePasswordField("currentPassword", e.target.value)
              }
              required
              error={passwordErrors.currentPassword}
            />
            <PasswordInput
              label="Nova senha"
              showRequirements
              value={passwordData.newPassword}
              onChange={(e) =>
                updatePasswordField("newPassword", e.target.value)
              }
              required
              error={passwordErrors.newPassword}
            />
            <PasswordInput
              label="Confirmar nova senha"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                updatePasswordField("confirmPassword", e.target.value)
              }
              required
              error={passwordErrors.confirmPassword}
            />
            <Button
              onClick={handleChangePassword}
              isLoading={saving}
              className="min-h-[44px] rounded-xl"
            >
              Alterar Senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
