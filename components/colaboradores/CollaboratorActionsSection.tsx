"use client";

import { useState } from "react";
import { FormSection } from "@/components/details";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { collaboratorService } from "@/services/collaborator.service";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { ShieldCheck, ShieldOff, KeyRound, Eye, EyeOff } from "lucide-react";

interface CollaboratorActionsSectionProps {
  collaboratorId: string;
  currentStatus?: string;
  onStatusChange?: (newStatus: string) => void;
}

export function CollaboratorActionsSection({
  collaboratorId,
  currentStatus,
  onStatusChange,
}: CollaboratorActionsSectionProps) {
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const isActive = currentStatus === "active";

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    try {
      const result = await collaboratorService.toggleStatus(collaboratorId);
      onStatusChange?.(result.status);
      showToast(
        result.status === "active"
          ? "Usuário ativado com sucesso!"
          : "Usuário desativado com sucesso!",
        "success",
      );
    } catch {
      showToast("Erro ao alterar status do usuário.", "error");
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleResetPassword = async () => {
    if (!password) {
      showToast("Informe a nova senha.", "error");
      return;
    }
    if (password.length < 6) {
      showToast("A senha deve ter no mínimo 6 caracteres.", "error");
      return;
    }
    if (password !== confirmPassword) {
      showToast("As senhas não coincidem.", "error");
      return;
    }

    setSavingPassword(true);
    try {
      await collaboratorService.resetPassword(collaboratorId, password);
      setPassword("");
      setConfirmPassword("");
      showToast("Senha redefinida com sucesso!", "success");
    } catch {
      showToast("Erro ao redefinir a senha.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <FormSection title="Acesso e Segurança">
        {/* Status do usuário */}
        <div
          className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
            isActive
              ? "border-teal-200 bg-teal-50"
              : currentStatus === "pending"
                ? "border-yellow-200 bg-yellow-50"
                : "border-neutral-200 bg-neutral-50"
          }`}
        >
          <div className="flex items-center gap-3">
            {isActive ? (
              <ShieldCheck className="w-5 h-5 text-teal-600" />
            ) : (
              <ShieldOff className="w-5 h-5 text-neutral-400" />
            )}
            <div>
              <p className="text-sm font-medium text-neutral-900">
                Acesso ao sistema
              </p>
              <p className="text-xs text-neutral-500">
                {isActive
                  ? "Usuário ativo — pode acessar o sistema"
                  : currentStatus === "pending"
                    ? "Pendente — aguardando primeiro acesso"
                    : "Inativo — acesso bloqueado"}
              </p>
            </div>
          </div>
          {/* Toggle switch */}
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            disabled={togglingStatus || currentStatus === "pending"}
            onClick={handleToggleStatus}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive ? "bg-teal-500" : "bg-neutral-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Redefinir senha */}
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-neutral-500" />
            <p className="text-sm font-medium text-neutral-900">
              Redefinir senha
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label="Nova senha"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-9 text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="relative">
              <Input
                label="Confirmar senha"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-9 text-neutral-400 hover:text-neutral-600"
              >
                {showConfirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              onClick={handleResetPassword}
              isLoading={savingPassword}
              disabled={!password || !confirmPassword}
            >
              Salvar nova senha
            </Button>
          </div>
        </div>
      </FormSection>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type as ToastType}
          onClose={hideToast}
        />
      )}
    </>
  );
}
