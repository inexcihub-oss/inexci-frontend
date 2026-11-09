"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Ban, ExternalLink, RotateCcw } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import Loading from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminAccountOverviewTab } from "@/components/admin/accounts/tabs/AdminAccountOverviewTab";
import { AdminAccountSubscriptionTab } from "@/components/admin/accounts/tabs/AdminAccountSubscriptionTab";
import { AdminAccountInvoicesTab } from "@/components/admin/accounts/tabs/AdminAccountInvoicesTab";
import { AdminAccountTeamTab } from "@/components/admin/accounts/tabs/AdminAccountTeamTab";
import { AdminAccountAiTab } from "@/components/admin/accounts/tabs/AdminAccountAiTab";
import { AdminAccountHistoryTab } from "@/components/admin/accounts/tabs/AdminAccountHistoryTab";
import { AdminAccountErrorsTab } from "@/components/admin/accounts/tabs/AdminAccountErrorsTab";
import { AdminAccountActivationTab } from "@/components/admin/accounts/tabs/AdminAccountActivationTab";
import { AdminAccountClinicalAccessTab } from "@/components/admin/accounts/tabs/AdminAccountClinicalAccessTab";
import { ManageSubscriptionMenu } from "@/components/admin/accounts/subscription/ManageSubscriptionMenu";
import {
  AccountStatusModal,
  type AccountStatusMode,
} from "@/components/admin/accounts/AccountStatusModal";
import { adminService } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";
import { cn, formatDate } from "@/lib/utils";

export type AdminAccountTabId =
  | "resumo"
  | "ativacao"
  | "assinatura"
  | "faturas"
  | "equipe"
  | "ia"
  | "erros"
  | "prontuario"
  | "historico";

export const ADMIN_ACCOUNT_TABS: Array<{
  id: AdminAccountTabId;
  label: string;
}> = [
  { id: "resumo", label: "Visão geral" },
  { id: "ativacao", label: "Ativação" },
  { id: "assinatura", label: "Assinatura" },
  { id: "faturas", label: "Faturas" },
  { id: "equipe", label: "Equipe" },
  { id: "ia", label: "Uso de IA" },
  { id: "erros", label: "Erros" },
  { id: "prontuario", label: "Prontuário (LGPD)" },
  { id: "historico", label: "Histórico de ações" },
];

function isTabId(value: string | null): value is AdminAccountTabId {
  return !!value && ADMIN_ACCOUNT_TABS.some((t) => t.id === value);
}

export function AdminAccountDetail({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [statusModal, setStatusModal] = useState<AccountStatusMode | null>(
    null,
  );
  const activeTab: AdminAccountTabId = isTabId(tabFromUrl)
    ? tabFromUrl
    : "resumo";

  const {
    data: account,
    isLoading,
    isError,
  } = useQuery({
    queryKey: adminKeys.account(ownerId),
    queryFn: () => adminService.getAccount(ownerId),
  });

  const { data: subscription } = useQuery({
    queryKey: adminKeys.accountSubscription(ownerId),
    queryFn: () => adminService.getAccountSubscription(ownerId),
  });

  const goToTab = (tab: AdminAccountTabId) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-1 items-center justify-center">
          <Loading size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !account) {
    return (
      <PageContainer>
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            title="Conta não encontrada"
            description="Verifique o link ou volte para a lista de contas."
            action={
              <Link href="/admin/clientes" className="ds-btn-inline">
                Voltar para Contas
              </Link>
            }
          />
        </div>
      </PageContainer>
    );
  }

  const stripeUrl = subscription?.stripeCustomerUrl ?? null;
  const deactivatedAt = account.accountDeactivatedAt ?? null;

  const content: Record<AdminAccountTabId, () => React.ReactNode> = {
    resumo: () => <AdminAccountOverviewTab account={account} />,
    ativacao: () => <AdminAccountActivationTab ownerId={ownerId} />,
    assinatura: () => <AdminAccountSubscriptionTab ownerId={ownerId} />,
    faturas: () => <AdminAccountInvoicesTab ownerId={ownerId} />,
    equipe: () => <AdminAccountTeamTab ownerId={ownerId} />,
    ia: () => <AdminAccountAiTab ownerId={ownerId} />,
    erros: () => <AdminAccountErrorsTab ownerId={ownerId} />,
    prontuario: () => <AdminAccountClinicalAccessTab ownerId={ownerId} />,
    historico: () => <AdminAccountHistoryTab ownerId={ownerId} />,
  };

  return (
    <PageContainer>
      <div className="flex h-full min-w-0 flex-col overflow-hidden">
        <header className="flex shrink-0 flex-col border-b border-neutral-100">
          <div className="flex flex-wrap items-center gap-3 px-3 pt-3 lg:px-6">
            <Link
              href="/admin/clientes"
              aria-label="Voltar para Contas"
              className="ds-toolbar-btn ds-toolbar-icon"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 text-base font-bold text-neutral-900 [overflow-wrap:anywhere] md:text-lg">
                  {account.name}
                </h1>
                <AdminStatusBadge
                  account={{
                    ...account,
                    accountDeactivatedAt: deactivatedAt,
                  }}
                />
              </div>
              <p className="text-xs text-neutral-500 [overflow-wrap:anywhere]">
                {account.email} · cliente desde {formatDate(account.createdAt)}{" "}
                · plano {account.plan.name}
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
              {stripeUrl && (
                <a
                  href={stripeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ds-toolbar-btn"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Abrir na Stripe
                </a>
              )}
              <ManageSubscriptionMenu
                ownerId={ownerId}
                subscription={subscription}
                hasGatewaySubscription={account.hasGatewaySubscription}
              />
              {deactivatedAt ? (
                <button
                  type="button"
                  onClick={() => setStatusModal("reactivate")}
                  className="ds-toolbar-btn"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reativar conta
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStatusModal("deactivate")}
                  className="ds-toolbar-btn text-red-700 hover:bg-red-50"
                >
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  Desativar conta
                </button>
              )}
            </div>
          </div>
          {deactivatedAt && (
            <div
              role="status"
              className="mx-3 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 lg:mx-6"
            >
              <Ban className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Conta desativada em {formatDate(deactivatedAt)}
                {account.accountDeactivatedByName
                  ? ` por ${account.accountDeactivatedByName}`
                  : ""}
                . Ninguém da clínica consegue entrar.
              </span>
            </div>
          )}
          <div
            role="tablist"
            aria-label="Seções da conta"
            className="flex w-full min-w-0 items-center gap-4 overflow-x-auto px-3 scrollbar-hide sm:gap-6 lg:px-6"
          >
            {ADMIN_ACCOUNT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`conta-aba-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`conta-painel-${tab.id}`}
                onClick={() => goToTab(tab.id)}
                className={cn(
                  "-mb-px min-h-[44px] shrink-0 whitespace-nowrap border-b-[3px] py-3 text-xs font-semibold transition-colors md:text-sm",
                  activeTab === tab.id
                    ? "border-teal-700 text-black"
                    : "border-transparent text-gray-500 hover:text-black",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>
        <div
          role="tabpanel"
          id={`conta-painel-${activeTab}`}
          aria-labelledby={`conta-aba-${activeTab}`}
          className="flex-1 overflow-y-auto bg-white"
        >
          <div className="px-3 py-4 lg:px-6">{content[activeTab]()}</div>
        </div>
      </div>
      {statusModal && (
        <AccountStatusModal
          isOpen
          onClose={() => setStatusModal(null)}
          mode={statusModal}
          ownerId={ownerId}
          accountName={account.name}
          blockedReason={
            subscription && !subscription.canDeactivate
              ? subscription.deactivationBlockedReason
              : null
          }
        />
      )}
    </PageContainer>
  );
}
