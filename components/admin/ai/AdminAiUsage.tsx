"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { Bot, DollarSign, TrendingUp } from "lucide-react";
import { AdminStatCard, AdminStatGrid } from "@/components/admin/AdminStatCard";
import { AreaLineChart } from "@/components/dashboard/charts/AreaLineChart";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AdminPeriodFilter,
  useAdminPeriod,
} from "@/components/admin/AdminPeriodFilter";
import { AiEfficiencyPanel } from "@/components/admin/ai/AiEfficiencyPanel";
import { AdminFilterField } from "@/components/admin/AdminFilters";
import { FinanceFilters } from "@/components/finance/FinanceFilters";
import { AiSourceSelect } from "@/components/admin/ai/AiSourceSelect";
import { AiUsageTable } from "@/components/admin/ai/AiUsageTable";
import { useAiUsageRows } from "@/components/admin/ai/useAiUsageRows";
import { formatUsdCents } from "@/lib/admin-format";
import {
  previousRange,
  projectMonthCostCents,
  recordsLabel,
  type AiSource,
} from "@/lib/admin-ai";
import { spTodayISODate } from "@/lib/calendar-date";
import { cn } from "@/lib/utils";

export type AdminAiTabId = "contas" | "usuarios" | "modelos" | "eficiencia";

export const ADMIN_AI_TABS: Array<{ id: AdminAiTabId; label: string }> = [
  { id: "contas", label: "Por conta" },
  { id: "usuarios", label: "Por usuário" },
  { id: "modelos", label: "Por modelo" },
  { id: "eficiencia", label: "Eficiência" },
];

function isTabId(value: string | null): value is AdminAiTabId {
  return !!value && ADMIN_AI_TABS.some((t) => t.id === value);
}

const sum = (rows: Array<{ costUsdCents: number | null }> | undefined) =>
  (rows ?? []).reduce((acc, r) => acc + (r.costUsdCents ?? 0), 0);

export function AdminAiUsage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const tab: AdminAiTabId = isTabId(tabFromUrl) ? tabFromUrl : "contas";

  const periodState = useAdminPeriod("month", [
    "month",
    "7d",
    "30d",
    "90d",
    "custom",
  ]);
  const [source, setSource] = useState<AiSource | "">("");
  const { range } = periodState;
  const filters = { source };
  const labels = recordsLabel(source);

  const owners = useAiUsageRows("owner", range, filters, tab === "contas");
  const previousOwners = useAiUsageRows(
    "owner",
    range ? previousRange(range) : null,
    filters,
    tab === "contas",
  );
  const users = useAiUsageRows("user", range, filters, tab === "usuarios");
  const models = useAiUsageRows("model", range, filters, tab === "modelos");
  const days = useAiUsageRows("day", range, filters);

  const totalCost = sum(days.data);
  const totalTokens = (days.data ?? []).reduce(
    (acc, r) => acc + r.totalTokens,
    0,
  );
  const isMonth = periodState.period === "month";
  const projection = isMonth
    ? projectMonthCostCents(totalCost, spTodayISODate())
    : null;

  const series = useMemo(
    () =>
      [...(days.data ?? [])]
        .sort((a, b) => a.groupKey.localeCompare(b.groupKey))
        .map((r) => ({ date: r.groupKey, value: (r.costUsdCents ?? 0) / 100 })),
    [days.data],
  );

  const previousMap = useMemo(
    () =>
      new Map(
        (previousOwners.data ?? []).map(
          (r) => [r.groupKey, r.costUsdCents ?? 0] as const,
        ),
      ),
    [previousOwners.data],
  );

  const goToTab = (next: AdminAiTabId) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("tab", next);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const tableProps = {
    recordsPlural: labels.plural,
    recordsSingular: labels.singular,
  };

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="shrink-0 border-b border-neutral-100 px-3 pt-3 lg:px-6">
          <h1 className="text-lg font-bold text-neutral-900">Uso de IA</h1>
          <p className="text-xs text-neutral-500">
            Tokens e custo estimado em US$
          </p>
          <div
            role="tablist"
            aria-label="Seções do uso de IA"
            className="flex items-center gap-5 overflow-x-auto scrollbar-hide sm:gap-6"
          >
            {ADMIN_AI_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`ia-aba-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`ia-painel-${t.id}`}
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

        <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <AdminPeriodFilter state={periodState} />
          {tab !== "eficiencia" && (
            <FinanceFilters
              activeCount={source ? 1 : 0}
              onClear={() => setSource("")}
            >
              <AdminFilterField label="Origem">
                <AiSourceSelect value={source} onChange={setSource} />
              </AdminFilterField>
            </FinanceFilters>
          )}
        </div>

        <div
          role="tabpanel"
          id={`ia-painel-${tab}`}
          aria-labelledby={`ia-aba-${tab}`}
          className="flex-1 space-y-4 overflow-auto p-3 lg:p-6"
        >
          {range === null ? (
            <EmptyState
              title="Informe o intervalo"
              description="Escolha as datas inicial e final."
            />
          ) : (
            <>
              {tab !== "eficiencia" && (
                <>
                  <AdminStatGrid columns={3}>
                    <AdminStatCard
                      icon={DollarSign}
                      accent="teal"
                      label={isMonth ? "Custo do mês" : "Custo no período"}
                      value={formatUsdCents(totalCost)}
                    />
                    {projection !== null && (
                      <AdminStatCard
                        icon={TrendingUp}
                        accent="amber"
                        label="Projeção do mês"
                        value={formatUsdCents(projection)}
                        footnote="Custo até hoje ÷ dias corridos × dias do mês"
                      />
                    )}
                    <AdminStatCard
                      icon={Bot}
                      accent="violet"
                      label="Tokens"
                      value={totalTokens.toLocaleString("pt-BR")}
                    />
                  </AdminStatGrid>
                  <section
                    aria-label="Custo por dia"
                    className="rounded-2xl border border-gray-200"
                  >
                    <div className="flex h-11 items-center border-b border-neutral-100 px-4">
                      <h2 className="text-sm font-semibold">
                        Custo por dia (US$)
                      </h2>
                    </div>
                    <div className="p-4">
                      <AreaLineChart data={series} />
                    </div>
                  </section>
                </>
              )}

              {tab === "contas" && (
                <AiUsageTable
                  kind="owner"
                  rows={owners.data}
                  isLoading={owners.isLoading}
                  isError={owners.isError}
                  previous={previousOwners.data ? previousMap : undefined}
                  {...tableProps}
                />
              )}
              {tab === "usuarios" && (
                <AiUsageTable
                  kind="user"
                  rows={users.data}
                  isLoading={users.isLoading}
                  isError={users.isError}
                  {...tableProps}
                />
              )}
              {tab === "modelos" && (
                <AiUsageTable
                  kind="model"
                  rows={models.data}
                  isLoading={models.isLoading}
                  isError={models.isError}
                  {...tableProps}
                />
              )}
              {tab === "eficiencia" && <AiEfficiencyPanel range={range} />}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
