"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import PageContainer from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/Card";
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
import { adminKeys } from "@/lib/query-keys";
import { formatDateTimeSP } from "@/lib/admin-audit";
import { addDaysISO, spDayStart } from "@/lib/calendar-date";
import {
  ENVIO_CHANNELS,
  ENVIO_CHANNEL_LABEL,
  ENVIO_STATUSES,
  ENVIO_STATUS_CLASS,
  ENVIO_STATUS_LABEL,
  isChannel,
  isSendStatus,
  isUuid,
  totalsByChannel,
} from "@/lib/admin-envios";
import { cn } from "@/lib/utils";
import {
  adminService,
  type NotificationLogItem,
  type NotificationLogListParams,
  type NotificationLogStatsParams,
} from "@/services/admin.service";

const PAGE_SIZE = 25;

const COLUMNS: AdminColumn<NotificationLogItem>[] = [
  {
    key: "data",
    header: "Data",
    mobile: "subtitle",
    className: "whitespace-nowrap",
    cell: (item) => formatDateTimeSP(item.createdAt),
  },
  {
    key: "canal",
    header: "Canal",
    cell: (item) => ENVIO_CHANNEL_LABEL[item.channel],
  },
  {
    key: "destinatario",
    header: "Destinatário",
    mobile: "title",
    className: "whitespace-nowrap",
    cell: (item) => item.recipient,
  },
  {
    key: "conta",
    header: "Conta",
    cell: (item) =>
      item.ownerId ? (
        <Link
          href={`/admin/clientes/${item.ownerId}`}
          className="text-teal-700 underline"
        >
          {item.ownerName ?? "Abrir conta"}
        </Link>
      ) : (
        <span className="text-gray-400" title="Envio sem conta vinculada">
          —
        </span>
      ),
  },
  {
    key: "modelo",
    header: "Modelo",
    cell: (item) => (
      <span title={item.template ?? undefined}>
        {item.templateLabel ?? item.template ?? "—"}
      </span>
    ),
  },
  {
    key: "situacao",
    header: "Situação",
    mobile: "badge",
    cell: (item) => (
      <span
        className={cn(
          "ds-badge-md whitespace-nowrap",
          ENVIO_STATUS_CLASS[item.status],
        )}
      >
        {ENVIO_STATUS_LABEL[item.status]}
      </span>
    ),
  },
  {
    key: "erro",
    header: "Erro",
    mobile: "full",
    className: "max-w-xs truncate",
    cell: (item) => item.error ?? "—",
  },
];

export function AdminEnvios() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const channelParam = searchParams.get("canal") ?? "";
  const statusParam = searchParams.get("situacao") ?? "";
  const accountParam = searchParams.get("conta") ?? "";
  const from = searchParams.get("de") ?? "";
  const to = searchParams.get("ate") ?? "";
  const page = Math.max(Number(searchParams.get("pagina")) || 1, 1);

  const channel = isChannel(channelParam) ? channelParam : undefined;
  const status = isSendStatus(statusParam) ? statusParam : undefined;
  const ownerId = isUuid(accountParam) ? accountParam.trim() : undefined;

  const [accountInput, setAccountInput] = useState(accountParam);
  const accountInvalid = accountInput.trim() !== "" && !isUuid(accountInput);

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

  const onAccountChange = (value: string) => {
    setAccountInput(value);
    const trimmed = value.trim();
    if (trimmed === "") updateParams({ conta: null });
    else if (isUuid(trimmed)) updateParams({ conta: trimmed });
  };

  const statsParams: NotificationLogStatsParams = useMemo(
    () => ({
      channel,
      ownerId,
      from: from ? spDayStart(from) : undefined,
      to: to ? spDayStart(addDaysISO(to, 1)) : undefined,
    }),
    [channel, ownerId, from, to],
  );

  const listParams: NotificationLogListParams = useMemo(
    () => ({
      ...statsParams,
      status,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [statsParams, status, page],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.notificationLogs(listParams),
    queryFn: () => adminService.listNotificationLogs(listParams),
    placeholderData: (previous) => previous,
  });

  const { data: stats = [] } = useQuery({
    queryKey: adminKeys.notificationLogStats(statsParams),
    queryFn: () => adminService.getNotificationLogStats(statsParams),
    placeholderData: (previous) => previous,
  });

  const totals = totalsByChannel(stats);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="shrink-0 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <h1 className="text-lg font-bold text-neutral-900">Envios</h1>
          <p className="text-xs text-neutral-500">
            E-mails e mensagens de WhatsApp disparados pela plataforma, sem o
            conteúdo da mensagem
          </p>
        </header>

        <div className="grid shrink-0 gap-3 border-b border-neutral-100 px-3 py-3 sm:grid-cols-2 lg:px-6">
          {ENVIO_CHANNELS.map((c) => (
            <Card
              key={c}
              data-testid={`envios-card-${c}`}
              className="rounded-2xl border border-gray-200"
            >
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold text-neutral-900">
                    {ENVIO_CHANNEL_LABEL[c]}
                  </h2>
                  <span className="text-xl font-semibold text-neutral-900">
                    {totals[c].total}
                  </span>
                </div>
                <dl className="mt-3 flex flex-wrap gap-1.5">
                  {ENVIO_STATUSES.map((s) => (
                    <div
                      key={s}
                      className={cn(
                        "ds-badge-md whitespace-nowrap",
                        ENVIO_STATUS_CLASS[s],
                      )}
                    >
                      <dt className="inline">{ENVIO_STATUS_LABEL[s]}</dt>
                      <dd className="ml-1 inline font-semibold">
                        {totals[c][s]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>

        <AdminFilters
          className="items-start py-3"
          activeCount={
            [channel, status, accountParam, from, to].filter(Boolean).length
          }
          onClear={() => {
            setAccountInput("");
            updateParams({
              canal: null,
              situacao: null,
              conta: null,
              de: null,
              ate: null,
            });
          }}
        >
          <AdminFilterField label="Canal">
            <select
              aria-label="Canal"
              className={cn(ADMIN_FILTER_CONTROL, "sm:min-w-36")}
              value={channel ?? ""}
              onChange={(e) => updateParams({ canal: e.target.value || null })}
            >
              <option value="">Todos os canais</option>
              {ENVIO_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {ENVIO_CHANNEL_LABEL[c]}
                </option>
              ))}
            </select>
          </AdminFilterField>
          <AdminFilterField label="Situação">
            <select
              aria-label="Situação"
              className={cn(ADMIN_FILTER_CONTROL, "sm:min-w-36")}
              value={status ?? ""}
              onChange={(e) =>
                updateParams({ situacao: e.target.value || null })
              }
            >
              <option value="">Todas as situações</option>
              {ENVIO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ENVIO_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </AdminFilterField>
          <AdminFilterField label="Conta (id)">
            <div className="flex flex-col gap-1">
              <input
                aria-label="Conta (id)"
                placeholder="Conta (id)"
                aria-invalid={accountInvalid}
                className={cn(ADMIN_FILTER_CONTROL, "sm:w-72")}
                value={accountInput}
                onChange={(e) => onAccountChange(e.target.value)}
              />
              {accountInvalid && (
                <p role="alert" className="text-xs text-red-600">
                  Informe o id completo da conta.
                </p>
              )}
            </div>
          </AdminFilterField>
          <AdminFilterField label="De">
            <label className="flex items-center gap-1.5 text-xs text-gray-700 md:text-sm">
              <span className="hidden sm:inline">De</span>
              <input
                type="date"
                aria-label="De"
                className={ADMIN_FILTER_CONTROL}
                value={from}
                onChange={(e) => updateParams({ de: e.target.value || null })}
              />
            </label>
          </AdminFilterField>
          <AdminFilterField label="Até">
            <label className="flex items-center gap-1.5 text-xs text-gray-700 md:text-sm">
              <span className="hidden sm:inline">Até</span>
              <input
                type="date"
                aria-label="Até"
                className={ADMIN_FILTER_CONTROL}
                value={to}
                onChange={(e) => updateParams({ ate: e.target.value || null })}
              />
            </label>
          </AdminFilterField>
        </AdminFilters>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : isError ? (
            <EmptyState
              title="Não foi possível carregar os envios"
              description="Tente novamente em instantes."
            />
          ) : items.length === 0 ? (
            <EmptyState
              title="Nenhum envio encontrado"
              description="Ajuste os filtros."
            />
          ) : (
            <AdminDataTable
              rows={items}
              columns={COLUMNS}
              rowKey={(item) => item.id}
            />
          )}
        </div>

        {total > PAGE_SIZE && (
          <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-neutral-100 px-3 py-2.5 text-xs text-gray-600 md:text-sm lg:px-6">
            <span>
              Página {page} de {lastPage} · {total} envios
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
