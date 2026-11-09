"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { SearchInput } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/AdminDataTable";
import {
  ADMIN_FILTER_CONTROL,
  AdminFilterField,
  AdminFilters,
} from "@/components/admin/AdminFilters";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminHealthBadge } from "@/components/admin/health/AdminHealthBadge";
import {
  HEALTH_BANDS,
  HEALTH_META,
  healthBandFromParam,
} from "@/lib/admin-health";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/useToast";
import { adminKeys } from "@/lib/query-keys";
import {
  adminService,
  type AdminAccountItem,
  type AdminAccountListParams,
  type AdminAccountSituationFilter,
} from "@/services/admin.service";
import {
  buildAccountsCsv,
  formatBrlCents,
  formatQuota,
  formatRelative,
  formatUsdCents,
} from "@/lib/admin-format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

type CountKey =
  "all" | "trial" | "active" | "past_due" | "internal" | "deactivated";

const SEGMENTS: Array<{
  id: "todas" | AdminAccountSituationFilter;
  label: string;
  countKey: CountKey;
}> = [
  { id: "todas", label: "Todas", countKey: "all" },
  { id: "trial", label: "Em trial", countKey: "trial" },
  { id: "active", label: "Pagantes", countKey: "active" },
  { id: "past_due", label: "Inadimplentes", countKey: "past_due" },
  { id: "internal", label: "Acesso interno", countKey: "internal" },
  { id: "deactivated", label: "Desativadas", countKey: "deactivated" },
];

const SEGMENT_IDS = SEGMENTS.map((s) => s.id) as string[];

const COLUMNS: AdminColumn<AdminAccountItem>[] = [
  {
    key: "conta",
    header: "Conta",
    mobile: "title",
    cell: (a) => (
      <>
        <p className="font-medium text-gray-900">{a.name}</p>
        <p className="text-xs font-normal text-gray-500">{a.email}</p>
      </>
    ),
  },
  { key: "plano", header: "Plano", cell: (a) => a.plan.name },
  {
    key: "situacao",
    header: "Situação",
    mobile: "badge",
    cell: (a) => <AdminStatusBadge account={a} />,
  },
  {
    key: "saude",
    header: "Saúde",
    cell: (a) => <AdminHealthBadge health={a.health} />,
  },
  {
    key: "mensalidade",
    header: "Mensalidade",
    cell: (a) =>
      a.monthlyAmountCents > 0 ? (
        formatBrlCents(a.monthlyAmountCents)
      ) : (
        <span className="text-gray-400">—</span>
      ),
  },
  {
    key: "equipe",
    header: "Equipe",
    className: "whitespace-nowrap",
    cell: (a) => `${a.doctors} méd · ${a.collaborators} colab`,
  },
  {
    key: "scs",
    header: "SCs no mês",
    cell: (a) =>
      formatQuota({ used: a.surgeryRequestsThisMonth, limit: a.quota.limit }),
  },
  {
    key: "ia",
    header: "IA no mês",
    cell: (a) => formatUsdCents(a.aiCostThisMonthUsdCents),
  },
  {
    key: "acesso",
    header: "Último acesso",
    className: "whitespace-nowrap text-gray-500",
    cell: (a) => formatRelative(a.lastSeenAt),
  },
];

function downloadCsv(content: string) {
  const blob = new Blob(["﻿" + content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "contas.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminAccountsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawSegment = searchParams.get("situacao");
  const segment =
    rawSegment && SEGMENT_IDS.includes(rawSegment) ? rawSegment : "todas";
  const q = searchParams.get("q") ?? "";
  const planId = searchParams.get("plano") ?? "";
  const trialParam = searchParams.get("trial");
  const trialDays = trialParam === "7" ? 7 : trialParam === "3" ? 3 : 0;
  const trialEnding = trialDays > 0;
  const inactive = searchParams.get("inativos") === "7";
  const health = healthBandFromParam(searchParams.get("saude"));
  const worstFirst = searchParams.get("ordem") === "saude";
  const page = Math.max(Number(searchParams.get("pagina")) || 1, 1);

  const [searchText, setSearchText] = useState(q);
  const debouncedSearch = useDebounce(searchText, 400);

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("pagina" in changes)) next.delete("pagina");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (debouncedSearch.trim() !== q) {
      updateParams({ q: debouncedSearch.trim() || null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const params: AdminAccountListParams = useMemo(
    () => ({
      search: q || undefined,
      situation:
        segment === "todas"
          ? undefined
          : (segment as AdminAccountSituationFilter),
      planId: planId || undefined,
      trialEndingInDays: trialEnding ? trialDays : undefined,
      inactiveDays: inactive ? 7 : undefined,
      health,
      ...(worstFirst
        ? { sortBy: "health" as const, sortDir: "asc" as const }
        : {}),
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [
      q,
      segment,
      planId,
      trialEnding,
      trialDays,
      inactive,
      health,
      worstFirst,
      page,
    ],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.accounts(params),
    queryFn: () => adminService.listAccounts(params),
    placeholderData: (previous) => previous,
  });

  const { data: plans = [] } = useQuery({
    queryKey: adminKeys.plans(),
    queryFn: () => adminService.listPlans(),
    staleTime: 10 * 60 * 1000,
  });

  const planOptions = [
    { value: "", label: "Todos os planos" },
    ...plans.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.billingPeriod === "YEARLY" ? "anual" : "mensal"})`,
    })),
  ];

  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { limit: _limit, offset: _offset, ...filters } = params;
      downloadCsv(
        buildAccountsCsv(await adminService.listAllAccounts(filters)),
      );
    } catch {
      showToast(
        "Não foi possível exportar as contas. Tente novamente.",
        "error",
      );
    } finally {
      setExporting(false);
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-neutral-900">Contas</h1>
            <p className="text-xs text-neutral-500">
              Clientes da plataforma, assinatura e uso
            </p>
          </div>
          <button
            type="button"
            className="ds-toolbar-btn"
            disabled={items.length === 0 || exporting}
            onClick={() => void exportCsv()}
            aria-label="Exportar CSV"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </header>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <SearchInput
            value={searchText}
            onChange={setSearchText}
            placeholder="Buscar por nome ou e-mail"
            className="w-full sm:w-72"
          />
          <div
            role="group"
            aria-label="Situação da conta"
            className="-mx-3 w-[calc(100%+1.5rem)] overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:px-0"
          >
            <div className="ds-segmented">
              {SEGMENTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={segment === s.id}
                  onClick={() =>
                    updateParams({ situacao: s.id === "todas" ? null : s.id })
                  }
                  className={cn(
                    "ds-segmented-item whitespace-nowrap",
                    segment === s.id && "ds-segmented-item-active",
                  )}
                >
                  {s.label}
                  {data ? ` (${data.counts[s.countKey]})` : ""}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AdminFilters
          activeCount={
            [planId, health, worstFirst, trialEnding, inactive].filter(Boolean)
              .length
          }
          onClear={() =>
            updateParams({
              plano: null,
              saude: null,
              ordem: null,
              trial: null,
              inativos: null,
            })
          }
        >
          <AdminFilterField label="Plano">
            <select
              aria-label="Plano"
              className={cn(ADMIN_FILTER_CONTROL, "sm:min-w-44")}
              value={planId}
              onChange={(e) => updateParams({ plano: e.target.value || null })}
            >
              {planOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </AdminFilterField>
          <AdminFilterField label="Saúde">
            <select
              aria-label="Saúde"
              className={cn(ADMIN_FILTER_CONTROL, "sm:min-w-36")}
              value={health ? HEALTH_META[health].param : ""}
              onChange={(e) => updateParams({ saude: e.target.value || null })}
            >
              <option value="">Toda saúde</option>
              {HEALTH_BANDS.map((band) => (
                <option key={band} value={HEALTH_META[band].param}>
                  {HEALTH_META[band].label}
                </option>
              ))}
            </select>
          </AdminFilterField>
          <AdminFilterField label="Ordenar">
            <select
              aria-label="Ordenar"
              className={cn(ADMIN_FILTER_CONTROL, "sm:min-w-44")}
              value={worstFirst ? "saude" : ""}
              onChange={(e) => updateParams({ ordem: e.target.value || null })}
            >
              <option value="">Mais recentes primeiro</option>
              <option value="saude">Pior saúde primeiro</option>
            </select>
          </AdminFilterField>
          <label className="flex items-center gap-2 text-xs text-gray-700 md:text-sm">
            <input
              type="checkbox"
              checked={trialEnding}
              onChange={(e) =>
                updateParams({ trial: e.target.checked ? "3" : null })
              }
            />
            Trial acabando em {trialDays || 3} dias
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-700 md:text-sm">
            <input
              type="checkbox"
              checked={inactive}
              onChange={(e) =>
                updateParams({ inativos: e.target.checked ? "7" : null })
              }
            />
            Sem acesso há 7 dias
          </label>
        </AdminFilters>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : isError ? (
            <EmptyState
              title="Não foi possível carregar as contas"
              description="Tente novamente em instantes."
            />
          ) : items.length === 0 ? (
            <EmptyState
              title="Nenhuma conta encontrada"
              description="Ajuste a busca ou os filtros."
            />
          ) : (
            <AdminDataTable
              rows={items}
              columns={COLUMNS}
              rowKey={(a) => a.ownerId}
              rowLabel={(a) => `Abrir ${a.name}`}
              onRowClick={(a) => router.push(`/admin/clientes/${a.ownerId}`)}
            />
          )}
        </div>

        {total > PAGE_SIZE && (
          <footer className="flex shrink-0 items-center justify-between border-t border-neutral-100 px-3 py-2.5 text-sm text-gray-600 lg:px-6">
            <span>
              Página {page} de {lastPage} · {total} contas
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="ds-btn-inline"
                disabled={page <= 1}
                onClick={() =>
                  updateParams({
                    pagina: page - 1 > 1 ? String(page - 1) : null,
                  })
                }
              >
                Anterior
              </button>
              <button
                type="button"
                className="ds-btn-inline"
                disabled={page >= lastPage}
                onClick={() => updateParams({ pagina: String(page + 1) })}
              >
                Próxima
              </button>
            </div>
          </footer>
        )}
      </div>
    </PageContainer>
  );
}
