"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SectionCard, SectionCardBody } from "@/components/shared/SectionCard";
import { FinancialAccountModal } from "@/components/finance/settings/FinancialAccountModal";
import { AccountStatementModal } from "@/components/finance/settings/AccountStatementModal";
import { useFinancialAccounts } from "@/hooks/useFinanceSettings";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { useToast } from "@/hooks/useToast";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";
import { getApiErrorMessage } from "@/lib/http-error";
import { cn } from "@/lib/utils";
import {
  FINANCIAL_ACCOUNT_TYPE_LABELS,
  type FinancialAccountDto,
} from "@/types/finance.types";

type ModalState = { open: false } | { open: true; account: FinancialAccountDto | null };

export function FinancialAccountsSection() {
  const { data: accounts = [], isLoading, isError } = useFinancialAccounts({
    includeInactive: true,
  });
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [extrato, setExtrato] = useState<FinancialAccountDto | null>(null);
  const { showSuccess, showError } = useToast();

  const alternarStatus = useFinanceMutation(
    (account: FinancialAccountDto) =>
      financeService.setAccountStatus(account.id, !account.active),
    {
      invalidate: [financeKeys.accounts(), financeKeys.paymentMethods()],
      onSuccess: (salva) =>
        showSuccess(salva.active ? "Conta ativada." : "Conta desativada."),
      onError: (error) =>
        showError(
          getApiErrorMessage(error, "Não foi possível alterar a conta."),
        ),
    },
  );

  return (
    <SectionCard
      title="Contas financeiras"
      headerAction={
        <button
          type="button"
          onClick={() => setModal({ open: true, account: null })}
          className="ds-btn-inline-primary inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
          Nova conta
        </button>
      }
    >
      <SectionCardBody>
        {isLoading ? (
          <p className="text-sm text-gray-500">Carregando contas...</p>
        ) : isError ? (
          <p className="text-sm text-red-600">
            Não foi possível carregar as contas.
          </p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma conta cadastrada. Cadastre o caixa físico, as maquininhas e
            as contas bancárias que recebem os pagamentos.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span className="truncate">{account.name}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        account.active
                          ? "bg-teal-50 text-teal-700"
                          : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {account.active ? "Ativa" : "Inativa"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {FINANCIAL_ACCOUNT_TYPE_LABELS[account.type]}
                    {account.notes ? ` · ${account.notes}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExtrato(account)}
                    className="ds-btn-inline inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Extrato ${account.name}`}
                  >
                    Extrato
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ open: true, account })}
                    className="ds-btn-inline inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Editar ${account.name}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarStatus.mutate(account)}
                    disabled={alternarStatus.isPending}
                    className="ds-btn-inline inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`${account.active ? "Desativar" : "Ativar"} ${account.name}`}
                  >
                    {account.active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCardBody>
      <FinancialAccountModal
        isOpen={modal.open}
        account={modal.open ? modal.account : null}
        onClose={() => setModal({ open: false })}
      />
      <AccountStatementModal
        isOpen={!!extrato}
        account={extrato}
        onClose={() => setExtrato(null)}
      />
    </SectionCard>
  );
}
