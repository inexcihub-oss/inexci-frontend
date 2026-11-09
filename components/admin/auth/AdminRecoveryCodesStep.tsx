"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Checkbox } from "@/components/ui/Checkbox";
import { RecoveryCodesPanel } from "@/components/configuracoes/mfa/RecoveryCodesPanel";

export function AdminRecoveryCodesStep({
  codes,
  email,
  onContinue,
}: {
  codes: string[];
  email?: string | null;
  onContinue: () => void;
}) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-4 font-urbanist text-xl font-semibold text-gray-900 sm:text-2xl">
          Verificação ativada
        </h1>
        <p className="mt-2 max-w-sm text-sm text-gray-600">
          Guarde os códigos de recuperação antes de entrar. Eles servem para
          acessar o painel se você perder o aplicativo autenticador.
        </p>
      </div>

      <RecoveryCodesPanel codes={codes} email={email} />

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <Checkbox
          checked={saved}
          onCheckedChange={setSaved}
          aria-label="Guardei os códigos de recuperação"
        />
        Guardei os códigos de recuperação em local seguro
      </label>

      <Button
        type="button"
        onClick={onContinue}
        disabled={!saved}
        className="min-h-[48px] w-full text-sm font-semibold"
      >
        Entrar no painel
      </Button>
    </div>
  );
}
