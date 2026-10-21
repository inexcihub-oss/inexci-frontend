"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { CashSessionPanel } from "@/components/finance/cash/CashSessionPanel";
import { CashHistory } from "@/components/finance/cash/CashHistory";
import { OtherOpenCashSessions } from "@/components/finance/cash/OtherOpenCashSessions";
import { OpenCashSessionModal } from "@/components/finance/cash/OpenCashSessionModal";
import {
  CashMovementModal,
  type CashMovementKind,
} from "@/components/finance/cash/CashMovementModal";
import { CloseCashSessionModal } from "@/components/finance/cash/CloseCashSessionModal";
import { useCurrentCashSession } from "@/hooks/useCurrentCashSession";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";

export function CashTab() {
  const { can, user } = useAuth();
  const podeAdministrar = can(Permission.ADMINISTRACAO);
  const { data, isLoading, isError, refetch } = useCurrentCashSession();
  const sessao = data?.session ?? null;
  const [abrindo, setAbrindo] = useState(false);
  const [movimento, setMovimento] = useState<CashMovementKind | null>(null);
  const [fechando, setFechando] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-red-600">
            Não foi possível carregar o caixa.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm font-semibold text-teal-700 hover:underline min-h-[44px]"
          >
            Tentar novamente
          </button>
        </div>
      ) : sessao ? (
        <section aria-label="Caixa atual" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium bg-green-50 text-green-700 border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
              Caixa aberto
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMovimento("supply")}
                className="ds-btn-inline inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suprimento
              </button>
              <button
                type="button"
                onClick={() => setMovimento("withdrawal")}
                className="ds-btn-inline inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Retirada
              </button>
              <button
                type="button"
                onClick={() => setFechando(true)}
                className="ds-btn-inline-primary inline-flex items-center justify-center gap-1.5"
              >
                Fechar caixa
              </button>
            </div>
          </div>
          <CashSessionPanel session={sessao} />
        </section>
      ) : (
        <EmptyState
          icon={<Wallet className="h-10 w-10" />}
          title="Caixa fechado"
          description="Abra o caixa para receber em dinheiro."
          action={
            <button
              type="button"
              onClick={() => setAbrindo(true)}
              className="ds-btn-primary"
            >
              Abrir caixa
            </button>
          }
        />
      )}

      {podeAdministrar && (
        <OtherOpenCashSessions currentUserId={user?.id ?? null} />
      )}

      <CashHistory />

      <OpenCashSessionModal isOpen={abrindo} onClose={() => setAbrindo(false)} />
      <CashMovementModal kind={movimento} onClose={() => setMovimento(null)} />
      {sessao && (
        <CloseCashSessionModal
          isOpen={fechando}
          onClose={() => setFechando(false)}
          session={sessao}
        />
      )}
    </div>
  );
}
