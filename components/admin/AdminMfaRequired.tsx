"use client";

import { ShieldCheck } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { Card } from "@/components/ui/Card";
import { MfaSection } from "@/components/configuracoes/MfaSection";
import { useToast } from "@/hooks/useToast";

export function AdminMfaRequired() {
  const { showToast } = useToast();

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-10">
        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <ShieldCheck className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              Ative a verificação em duas etapas
            </h1>
            <p className="text-sm text-gray-500">
              O painel administrativo só abre para contas com verificação em
              duas etapas ativa. Configure o aplicativo autenticador abaixo para
              liberar o acesso.
            </p>
          </div>
          <Card className="overflow-hidden rounded-2xl border border-gray-200 divide-y divide-gray-100">
            <MfaSection showToast={showToast} />
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
