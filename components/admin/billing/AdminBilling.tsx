"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { AdminRevenueTab } from "@/components/admin/billing/AdminRevenueTab";
import { AdminInvoicesTab } from "@/components/admin/billing/AdminInvoicesTab";
import { AdminForecastTab } from "@/components/admin/billing/AdminForecastTab";
import { AdminDelinquencyTab } from "@/components/admin/billing/AdminDelinquencyTab";
import { cn } from "@/lib/utils";

export type AdminBillingTabId =
  "receita" | "faturas" | "previsao" | "inadimplencia";

export const ADMIN_BILLING_TABS: Array<{
  id: AdminBillingTabId;
  label: string;
}> = [
  { id: "receita", label: "Receita" },
  { id: "faturas", label: "Faturas" },
  { id: "previsao", label: "Previsão" },
  { id: "inadimplencia", label: "Inadimplência" },
];

function isTabId(value: string | null): value is AdminBillingTabId {
  return !!value && ADMIN_BILLING_TABS.some((t) => t.id === value);
}

export function AdminBilling() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const tab: AdminBillingTabId = isTabId(tabFromUrl) ? tabFromUrl : "receita";

  const goToTab = (next: AdminBillingTabId) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("tab", next);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const content: Record<AdminBillingTabId, () => React.ReactNode> = {
    receita: () => <AdminRevenueTab />,
    faturas: () => <AdminInvoicesTab />,
    previsao: () => <AdminForecastTab />,
    inadimplencia: () => <AdminDelinquencyTab />,
  };

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="shrink-0 border-b border-neutral-100 px-3 pt-3 lg:px-6">
          <h1 className="text-lg font-bold text-neutral-900">Faturamento</h1>
          <p className="text-xs text-neutral-500">
            Receita em R$, espelhada da Stripe
          </p>
          <div
            role="tablist"
            aria-label="Seções do faturamento"
            className="flex items-center gap-5 overflow-x-auto scrollbar-hide sm:gap-6"
          >
            {ADMIN_BILLING_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`faturamento-aba-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`faturamento-painel-${t.id}`}
                onClick={() => goToTab(t.id)}
                className={cn(
                  "-mb-px min-h-[44px] whitespace-nowrap py-3 text-sm font-semibold transition-all",
                  tab === t.id
                    ? "border-b-[3px] border-teal-700 text-black"
                    : "text-gray-500 hover:text-black",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>
        <div
          role="tabpanel"
          id={`faturamento-painel-${tab}`}
          aria-labelledby={`faturamento-aba-${tab}`}
          className="flex-1 overflow-auto p-3 lg:p-6"
        >
          {content[tab]()}
        </div>
      </div>
    </PageContainer>
  );
}
