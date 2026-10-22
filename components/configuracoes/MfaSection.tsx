"use client";

import { useState } from "react";
import { LifeBuoy, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import Button from "@/components/ui/Button";
import type { ToastType } from "@/types/toast.types";
import { useAuth } from "@/contexts/AuthContext";
import { MfaEnableModal } from "./mfa/MfaEnableModal";
import { MfaDisableModal } from "./mfa/MfaDisableModal";
import { MfaRecoveryCodesModal } from "./mfa/MfaRecoveryCodesModal";
import { SecurityRow, StatusBadge } from "./SecurityRow";

type ModalAberto = "ativar" | "desativar" | "codigos" | null;

export function MfaSection({
  showToast,
}: {
  showToast: (message: string, type?: ToastType) => void;
}) {
  const { user, updateUser } = useAuth();
  const [modal, setModal] = useState<ModalAberto>(null);
  const enabled = !!user?.mfaEnabled;
  const recommended = !enabled && !!user?.mfaRecommended;

  const fechar = () => setModal(null);

  return (
    <>
      <SecurityRow
        icon={Smartphone}
        title="Verificação em duas etapas"
        badge={
          enabled ? (
            <StatusBadge tone="success">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Ativa
            </StatusBadge>
          ) : (
            <StatusBadge tone="neutral">Desativada</StatusBadge>
          )
        }
        description={
          <>
            {enabled
              ? "Ao entrar, além da senha, pedimos o código de 6 dígitos do aplicativo autenticador do seu celular."
              : "Ao entrar, além da senha, peça um código de 6 dígitos gerado no celular por um aplicativo como Google Authenticator, Microsoft Authenticator ou Authy."}
            {recommended && (
              <span
                data-testid="mfa-recommended"
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700"
              >
                <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                Recomendado para quem administra a conta
              </span>
            )}
          </>
        }
        action={
          enabled ? (
            <Button
              variant="ghost"
              onClick={() => setModal("desativar")}
              className="min-h-[44px] rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Desativar
            </Button>
          ) : (
            <Button
              onClick={() => setModal("ativar")}
              aria-label="Ativar verificação em duas etapas"
              className="min-h-[44px] rounded-xl"
            >
              Ativar
            </Button>
          )
        }
      />

      {enabled && (
        <SecurityRow
          icon={LifeBuoy}
          title="Códigos de recuperação"
          description="Use um desses códigos para entrar se perder o acesso ao celular. Cada código vale uma vez."
          action={
            <Button
              variant="outline"
              onClick={() => setModal("codigos")}
              aria-label="Gerar novos códigos de recuperação"
              className="min-h-[44px] rounded-xl"
            >
              Gerar novos códigos
            </Button>
          }
        />
      )}

      <MfaEnableModal
        isOpen={modal === "ativar"}
        email={user?.email}
        onClose={fechar}
        onEnabled={() => {
          void updateUser();
          showToast("Verificação em duas etapas ativada.", "success");
        }}
      />
      <MfaDisableModal
        isOpen={modal === "desativar"}
        onClose={fechar}
        onDisabled={() => {
          fechar();
          void updateUser();
          showToast(
            "Verificação em duas etapas desativada. As outras sessões foram encerradas.",
            "success",
          );
        }}
      />
      <MfaRecoveryCodesModal
        isOpen={modal === "codigos"}
        email={user?.email}
        onClose={fechar}
      />
    </>
  );
}
