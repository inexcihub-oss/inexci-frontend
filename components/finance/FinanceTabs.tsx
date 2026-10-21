"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { ReceivablesTab } from "@/components/finance/tabs/ReceivablesTab";
import { PaymentsTab } from "@/components/finance/tabs/PaymentsTab";
import { CashTab } from "@/components/finance/tabs/CashTab";
import { ReportsTab } from "@/components/finance/tabs/ReportsTab";
import { cn } from "@/lib/utils";

export type FinanceTabId = "receber" | "recebimentos" | "caixa" | "relatorios";

export const FINANCE_TABS: Array<{ id: FinanceTabId; label: string }> = [
  { id: "receber", label: "A receber" },
  { id: "recebimentos", label: "Recebimentos" },
  { id: "caixa", label: "Caixa" },
  { id: "relatorios", label: "Relatórios" },
];

const TAB_IDS = FINANCE_TABS.map((t) => t.id);

export function isFinanceTabId(value: string | null): value is FinanceTabId {
  return !!value && (TAB_IDS as string[]).includes(value);
}

const TAB_CONTENT: Record<FinanceTabId, () => React.ReactNode> = {
  receber: () => <ReceivablesTab />,
  recebimentos: () => <PaymentsTab />,
  caixa: () => <CashTab />,
  relatorios: () => <ReportsTab />,
};

export function FinanceTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<FinanceTabId>(
    isFinanceTabId(tabFromUrl) ? tabFromUrl : "receber",
  );

  const goToTab = (tab: FinanceTabId) => {
    setActiveTab(tab);
    router.replace(`?tab=${tab}`, { scroll: false });
  };

  return (
    <PageContainer>
      <div className="flex flex-col h-full overflow-hidden">
        <header className="flex flex-col border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2 px-3 lg:px-6 pt-3">
            <div className="min-w-0">
              <h1 className="text-base lg:text-lg font-bold text-neutral-900">
                Financeiro
              </h1>
              <p className="text-xs text-neutral-500">
                Cobranças, recebimentos e caixa da clínica
              </p>
            </div>
            <Link
              href="/financeiro/configuracoes"
              aria-label="Configurações"
              className="ds-btn-inline ml-auto inline-flex items-center justify-center gap-1.5 min-w-8 md:min-w-9 shrink-0"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configurações</span>
            </Link>
          </div>
          <div
            role="tablist"
            aria-label="Seções do financeiro"
            className="flex items-center gap-5 sm:gap-6 px-3 lg:px-6 overflow-x-auto scrollbar-hide"
          >
            {FINANCE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`financeiro-aba-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`financeiro-painel-${tab.id}`}
                onClick={() => goToTab(tab.id)}
                className={cn(
                  "py-3 text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] -mb-px",
                  activeTab === tab.id
                    ? "text-black border-b-[3px] border-teal-700"
                    : "text-gray-500 hover:text-black",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>
        <div
          role="tabpanel"
          id={`financeiro-painel-${activeTab}`}
          aria-labelledby={`financeiro-aba-${activeTab}`}
          className="flex-1 overflow-y-auto bg-white"
        >
          <div className="px-3 lg:px-6 py-4">{TAB_CONTENT[activeTab]()}</div>
        </div>
      </div>
    </PageContainer>
  );
}
