"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import PageContainer from "@/components/PageContainer";
import {
  Activity,
  CalendarCheck,
  ClipboardList,
  FileCheck,
  Users,
} from "lucide-react";
import { AdminStatCard, AdminStatGrid } from "@/components/admin/AdminStatCard";
import { AreaLineChart } from "@/components/dashboard/charts/AreaLineChart";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/AdminDataTable";
import { formatRelative } from "@/lib/admin-format";
import {
  AdminPeriodFilter,
  useAdminPeriod,
} from "@/components/admin/AdminPeriodFilter";
import { adminKeys } from "@/lib/query-keys";
import {
  adminService,
  type AdminInactiveAccount,
  type AdminInactiveDays,
  type AdminUsageParams,
  type AdminUsageRankingItem,
} from "@/services/admin.service";
import { cn } from "@/lib/utils";

const INACTIVE_OPTIONS: AdminInactiveDays[] = [7, 15, 30];

const INACTIVE_COLUMNS: AdminColumn<AdminInactiveAccount>[] = [
  {
    key: "conta",
    header: "Conta",
    mobile: "title",
    cell: (a) => (
      <>
        <Link
          href={`/admin/clientes/${a.ownerId}`}
          className="font-medium text-gray-900 hover:underline"
        >
          {a.name}
        </Link>
        <p className="text-xs font-normal text-gray-500">{a.email}</p>
      </>
    ),
  },
  { key: "plano", header: "Plano", cell: (a) => a.plan.name },
  {
    key: "situacao",
    header: "Situação",
    mobile: "badge",
    cell: (a) => (
      <AdminStatusBadge account={{ ...a, currentPeriodEnd: null }} />
    ),
  },
  {
    key: "acesso",
    header: "Último acesso",
    className: "whitespace-nowrap text-gray-500",
    cell: (a) => formatRelative(a.lastSeenAt),
  },
];

function Ranking({
  title,
  unit,
  items,
}: {
  title: string;
  unit: string;
  items: AdminUsageRankingItem[];
}) {
  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-gray-200 overflow-hidden"
    >
      <div className="flex h-11 items-center border-b border-neutral-100 px-4">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">Sem dados no período.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">{unit}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.ownerId}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Link
                    href={`/admin/clientes/${item.ownerId}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-gray-500">{item.email}</p>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {item.count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

function InactiveAccounts() {
  const [days, setDays] = useState<AdminInactiveDays>(7);
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.inactiveAccounts(days),
    queryFn: () => adminService.getInactiveAccounts(days),
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <section
      aria-label="Contas paradas"
      className="rounded-2xl border border-gray-200 overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">Contas paradas</h2>
          {data && (
            <p className="text-xs text-gray-500">
              {items.length < total
                ? `${items.length} de ${total} contas`
                : `${total} ${total === 1 ? "conta" : "contas"}`}
            </p>
          )}
        </div>
        <div
          role="group"
          aria-label="Sem acesso há"
          className="ds-segmented max-w-full overflow-x-auto"
        >
          {INACTIVE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={days === option}
              onClick={() => setDays(option)}
              className={cn(
                "ds-segmented-item whitespace-nowrap",
                days === option && "ds-segmented-item-active",
              )}
            >
              {option} dias
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loading size="lg" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Não foi possível carregar as contas paradas"
          description="Tente novamente em instantes."
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhuma conta parada"
          description={`Todas acessaram nos últimos ${days} dias.`}
        />
      ) : (
        <AdminDataTable
          rows={items}
          columns={INACTIVE_COLUMNS}
          rowKey={(a) => a.ownerId}
        />
      )}
    </section>
  );
}

export function AdminUsage() {
  const periodState = useAdminPeriod("30d");
  const params: AdminUsageParams | null = periodState.range;

  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.usage(params ?? {}),
    queryFn: () => adminService.getUsage(params ?? {}),
    enabled: params !== null,
    placeholderData: (previous) => previous,
  });

  const surgeryChart = (data?.weekly ?? []).map((w) => ({
    date: w.weekStart,
    value: w.surgeryRequestsCreated,
  }));
  const appointmentsChart = (data?.weekly ?? []).map((w) => ({
    date: w.weekStart,
    value: w.appointments.scheduled,
  }));

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="shrink-0 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <h1 className="text-lg font-bold text-neutral-900">
            Uso da plataforma
          </h1>
          <p className="text-xs text-neutral-500">
            Atividade dos clientes no período
          </p>
        </header>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <AdminPeriodFilter state={periodState} />
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-3 lg:p-6">
          {params === null ? (
            <EmptyState
              title="Informe o intervalo"
              description="Escolha as datas inicial e final."
            />
          ) : isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : isError || !data ? (
            <EmptyState
              title="Não foi possível carregar o uso"
              description="Tente novamente em instantes."
            />
          ) : (
            <>
              <AdminStatGrid columns={6}>
                <AdminStatCard
                  icon={ClipboardList}
                  accent="teal"
                  label="SCs criadas"
                  value={data.totals.surgeryRequestsCreated}
                  footnote={`${data.totals.surgeryRequestsSent} enviadas`}
                />
                <AdminStatCard
                  icon={CalendarCheck}
                  accent="blue"
                  label="Consultas agendadas"
                  value={data.totals.appointments.scheduled}
                  footnote={`${data.totals.appointments.completed} realizadas · ${data.totals.appointments.cancelled} canceladas · ${data.totals.appointments.noShow} faltas`}
                />
                <AdminStatCard
                  icon={Users}
                  accent="violet"
                  label="Pacientes novos"
                  value={data.totals.patientsCreated}
                />
                <AdminStatCard
                  icon={FileCheck}
                  accent="emerald"
                  label="Fichas finalizadas"
                  value={data.totals.recordsFinalized}
                />
                <AdminStatCard
                  icon={Activity}
                  accent="amber"
                  label="Contas ativas em 7 dias"
                  value={data.activeAccounts.last7Days}
                  footnote={`de ${data.activeAccounts.totalClients} contas`}
                />
                <AdminStatCard
                  icon={Activity}
                  accent="amber"
                  label="Contas ativas em 30 dias"
                  value={data.activeAccounts.last30Days}
                  footnote={`de ${data.activeAccounts.totalClients} contas`}
                />
              </AdminStatGrid>

              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  { title: "SCs criadas por semana", series: surgeryChart },
                  {
                    title: "Consultas agendadas por semana",
                    series: appointmentsChart,
                  },
                ].map((c) => (
                  <section
                    key={c.title}
                    aria-label={c.title}
                    className="rounded-2xl border border-gray-200"
                  >
                    <div className="flex h-11 items-center border-b border-neutral-100 px-4">
                      <h2 className="text-sm font-semibold">{c.title}</h2>
                    </div>
                    <div className="p-4">
                      <AreaLineChart data={c.series} />
                    </div>
                  </section>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Ranking
                  title="Mais solicitações cirúrgicas"
                  unit="SCs"
                  items={data.topBySurgeryRequests}
                />
                <Ranking
                  title="Mais consultas"
                  unit="Consultas"
                  items={data.topByAppointments}
                />
              </div>
            </>
          )}
          <InactiveAccounts />
        </div>
      </div>
    </PageContainer>
  );
}
