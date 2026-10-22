"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { ToastType } from "@/types/toast.types";
import { useAuth } from "@/contexts/AuthContext";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { MfaSection } from "./MfaSection";
import { SecurityRow } from "./SecurityRow";

export function SecurityTab({
  showToast,
}: {
  showToast: (message: string, type?: ToastType) => void;
}) {
  const { user } = useAuth();
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  return (
    <Card className="overflow-hidden rounded-2xl border border-gray-200 divide-y divide-gray-100">
      <SecurityRow
        icon={KeyRound}
        title="Senha"
        description="Use uma senha forte, que você não usa em outros sites."
        action={
          <Button
            variant="outline"
            onClick={() => setTrocandoSenha(true)}
            className="min-h-[44px] rounded-xl"
          >
            Alterar senha
          </Button>
        }
      />

      <MfaSection showToast={showToast} />

      <ChangePasswordModal
        isOpen={trocandoSenha}
        email={user?.email}
        onClose={() => setTrocandoSenha(false)}
        showToast={showToast}
      />
    </Card>
  );
}
