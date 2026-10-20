"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { ToastType } from "@/types/toast.types";
import { useAuth } from "@/contexts/AuthContext";
import { MfaEnableModal } from "./mfa/MfaEnableModal";
import { MfaDisableModal } from "./mfa/MfaDisableModal";
import { MfaRecoveryCodesModal } from "./mfa/MfaRecoveryCodesModal";

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
    <Card className="border border-gray-200 rounded-2xl">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">
            Verificação em duas etapas
          </h3>
          {enabled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Ativa
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
              Desativada
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Além da senha, peça um código do aplicativo autenticador ao entrar.
        </p>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="max-w-md space-y-4">
          {recommended && (
            <p
              data-testid="mfa-recommended"
              className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              Você administra a conta. Recomendamos ativar a verificação em
              duas etapas.
            </p>
          )}

          {enabled ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setModal("codigos")}
                className="min-h-[44px] rounded-xl"
              >
                Gerar novos códigos de recuperação
              </Button>
              <Button
                variant="danger"
                onClick={() => setModal("desativar")}
                className="min-h-[44px] rounded-xl"
              >
                Desativar
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setModal("ativar")}
              className="min-h-[44px] rounded-xl"
            >
              Ativar verificação em duas etapas
            </Button>
          )}
        </div>
      </CardContent>

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
    </Card>
  );
}
