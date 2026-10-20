"use client";

import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import {
  SurgeryRequestStatusCode,
  TERMINAL_STATUSES,
  isStatusIn,
} from "@/lib/surgery-request-status";
import { formatCurrency } from "@/lib/utils";
import { fetchDashboard } from "@/components/dashboard/dashboard-data";
import {
  AlertCard,
  FinancialKPICard,
  KPICard,
} from "@/components/dashboard/KpiCards";
import { HealthPlanTable } from "@/components/dashboard/HealthPlanTable";
import { StatusPipeline } from "@/components/dashboard/charts/StatusPipeline";
import { DonutChart } from "@/components/dashboard/charts/DonutChart";
import { HorizontalBarChart } from "@/components/dashboard/charts/HorizontalBarChart";
import { MonthlyBarChart } from "@/components/dashboard/charts/MonthlyBarChart";
import { AreaLineChart } from "@/components/dashboard/charts/AreaLineChart";
import {
  DashboardFilterModal,
  DashboardFilters,
  DEFAULT_DASHBOARD_FILTERS,
  countActiveDashboardFilters,
  buildReportFilters,
} from "@/components/dashboard/DashboardFilterModal";

export default function DashboardPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>(
    DEFAULT_DASHBOARD_FILTERS,
  );

  const {
    data: dashboard = null,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["reports", "dashboard", dashboardFilters],
    queryFn: () => fetchDashboard(buildReportFilters(dashboardFilters)),
    placeholderData: keepPreviousData,
  });

  const loading = isFetching;
  const error = isError ? "Erro ao carregar dados do dashboard" : null;

  const activeFilterCount = useMemo(
    () => countActiveDashboardFilters(dashboardFilters),
    [dashboardFilters],
  );

  const activeRequests = useMemo(() => {
    if (!dashboard) return 0;
    return dashboard.byStatus
      .filter((s) => !isStatusIn(s.status, TERMINAL_STATUSES))
      .reduce((sum, s) => sum + s.total, 0);
  }, [dashboard]);

  const pendingCount = useMemo(
    () => dashboard?.byStatus.find(
        (s) => s.status === SurgeryRequestStatusCode.PENDING,
      )?.total || 0,
    [dashboard],
  );

  const invoicedCount = useMemo(
    () => dashboard?.byStatus.find(
        (s) => s.status === SurgeryRequestStatusCode.INVOICED,
      )?.total || 0,
    [dashboard],
  );

  const temporalInvoicedData = useMemo(
    () =>
      dashboard?.temporalData.map((d) => ({
        date: d.date,
        value: d.invoiced,
      })) || [],
    [dashboard],
  );

  const temporalCountData = useMemo(
    () =>
      dashboard?.temporalData.map((d) => ({
        date: d.date,
        value: d.count,
      })) || [],
    [dashboard],
  );

  const monthlyAvg = useMemo(() => {
    if (!dashboard || dashboard.monthlyEvolution.length === 0) return 0;
    return Math.round(
      dashboard.monthlyEvolution.reduce((sum, m) => sum + m.count, 0) /
        dashboard.monthlyEvolution.length,
    );
  }, [dashboard]);

  const hasAlerts = useMemo(() => {
    if (!dashboard) return false;
    return dashboard.pendingNotifications.total > 0 || invoicedCount > 0;
  }, [dashboard, invoicedCount]);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Carregando dashboard...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !dashboard) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
              <Image src="/icons/warning.svg" alt="" width={28} height={28} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Erro ao carregar dados
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {error || "Dados não disponíveis"}
            </p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex justify-between items-center px-4 lg:px-6 py-4 lg:py-5 border-b border-gray-200">
        <div>
          <h1 className="ds-page-title">Dashboard</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Visão geral das solicitações cirúrgicas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFilterOpen(true)}
            data-tour="dashboard-filtros"
            className={`relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors min-h-[44px] active:scale-[0.98] ${
              activeFilterCount > 0
                ? "bg-teal-50 border-teal-300 text-teal-700"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Image
              src="/icons/filter.svg"
              alt=""
              width={16}
              height={16}
              className={activeFilterCount > 0 ? "opacity-100" : "opacity-60"}
            />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 bg-teal-600 text-white text-[10px] font-bold rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          <Link
            href="/solicitacoes-cirurgicas"
            data-tour="dashboard-ver-kanban"
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors min-h-[44px] active:scale-[0.98]"
          >
            <Image
              src="/icons/grid-layout.svg"
              alt="Ver Kanban"
              width={16}
              height={16}
              className="brightness-0 invert"
            />
            <span className="hidden sm:inline">Ver Kanban</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
          <div
            className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4"
            data-tour="dashboard-kpis"
          >
            <KPICard
              title="Total de Solicitações"
              value={dashboard.total}
              icon="/icons/status-surgeries.svg"
              subtitle={`${activeRequests} ativas`}
              color="teal"
            />
            <KPICard
              title="Pendentes"
              value={pendingCount}
              icon="/icons/clock.svg"
              subtitle="Aguardando envio"
              color="amber"
            />
            <KPICard
              title="Autorizadas"
              value={dashboard.totalAuthorized}
              icon="/icons/checkmark-circle.svg"
              subtitle={`${dashboard.approvalRate.toFixed(1)}% de aprovação`}
              trend={
                dashboard.approvalRate >= 70
                  ? "up"
                  : dashboard.approvalRate >= 40
                    ? "neutral"
                    : "down"
              }
              trendLabel={`${dashboard.approvalRate.toFixed(0)}%`}
              color="green"
            />
            <KPICard
              title="Realizadas"
              value={dashboard.totalDone}
              icon="/icons/checkbox.svg"
              subtitle="Cirurgias concluídas"
              color="blue"
            />
            <KPICard
              title="Tempo Médio"
              value={`${dashboard.avgCompletionDays.toFixed(0)}d`}
              icon="/icons/alarm-clock-time.svg"
              subtitle="Envio → Finalização"
              color="violet"
            />
            <KPICard
              title="Alertas"
              value={dashboard.pendingNotifications.total}
              icon="/icons/bell-notification.svg"
              subtitle="Requerem atenção"
              trend={dashboard.pendingNotifications.total > 0 ? "down" : "up"}
              trendLabel={
                dashboard.pendingNotifications.total > 0 ? "Atenção" : "OK"
              }
              color="red"
            />
          </div>

          <Card className="border border-gray-200 rounded-2xl">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Pipeline de Solicitações
                </h3>
                <span className="text-xs text-gray-500">
                  {dashboard.total} total
                </span>
              </div>
              <StatusPipeline
                byStatus={dashboard.byStatus}
                total={dashboard.total}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <FinancialKPICard
              title="Total Faturado"
              value={dashboard.totalInvoiced}
              icon="/icons/dollar-cash-circle.svg"
              color="blue"
            />
            <FinancialKPICard
              title="Total Recebido"
              value={dashboard.totalReceived}
              icon="/icons/dollar-cash-circle.svg"
              color="green"
            />
            <FinancialKPICard
              title="A Receber"
              value={dashboard.toReceive}
              icon="/icons/dollar-cash-circle.svg"
              color={dashboard.toReceive > 0 ? "amber" : "green"}
            />
          </div>

          {hasAlerts && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.pendingNotifications.pendingAnalysis > 0 && (
                <AlertCard
                  title="Em Análise há mais de 5 dias"
                  count={dashboard.pendingNotifications.pendingAnalysis}
                  description="Aguardando resposta da operadora"
                  color="amber"
                  icon="/icons/warning.svg"
                />
              )}
              {dashboard.pendingNotifications.pendingScheduling > 0 && (
                <AlertCard
                  title="Em Agendamento há mais de 5 dias"
                  count={dashboard.pendingNotifications.pendingScheduling}
                  description="Aguardando confirmação de data"
                  color="red"
                  icon="/icons/alarm-clock-time.svg"
                />
              )}
              {invoicedCount > 0 && (
                <AlertCard
                  title="Aguardando Pagamento"
                  count={invoicedCount}
                  description="Faturadas aguardando recebimento"
                  color="blue"
                  icon="/icons/dollar-cash-circle.svg"
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-gray-200 rounded-2xl">
              <CardHeader className="p-4 pb-0">
                <h3 className="ds-section-title">Distribuição por Status</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Todas as solicitações
                </p>
              </CardHeader>
              <CardContent className="p-4 flex flex-col items-center">
                <DonutChart
                  data={dashboard.byStatus.map((s) => ({
                    label: s.label,
                    value: s.total,
                    color: s.color,
                  }))}
                  centerLabel="Total"
                  centerValue={dashboard.total}
                />
                <div className="mt-4 w-full">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
                    {dashboard.byStatus
                      .filter((s) => s.total > 0)
                      .sort((a, b) => b.total - a.total)
                      .map((item) => (
                        <div
                          key={item.status}
                          className="flex items-center gap-2 text-xs"
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-gray-600 truncate">
                            {item.label}
                          </span>
                          <span className="text-gray-800 font-semibold ml-auto">
                            {item.total}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 rounded-2xl">
              <CardHeader className="p-4 pb-0">
                <h3 className="ds-section-title">Evolução de Faturamento</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Valores faturados nos últimos 30 dias
                </p>
              </CardHeader>
              <CardContent className="p-4">
                <AreaLineChart data={temporalInvoicedData} height={200} />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">Total faturado</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      {formatCurrency(dashboard.totalInvoiced)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total recebido</p>
                    <p className="text-lg font-semibold text-emerald-700">
                      {formatCurrency(dashboard.totalReceived)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-gray-200 rounded-2xl">
              <CardHeader className="p-4 pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="ds-section-title">Evolução Mensal</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Solicitações criadas por mês
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Média mensal</p>
                    <p className="text-lg font-semibold text-teal-700">
                      {monthlyAvg}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <MonthlyBarChart data={dashboard.monthlyEvolution} />
              </CardContent>
            </Card>

            <Card className="border border-gray-200 rounded-2xl">
              <CardHeader className="p-4 pb-0">
                <h3 className="ds-section-title">Procedimentos por Hospital</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Distribuição entre hospitais
                </p>
              </CardHeader>
              <CardContent className="p-4">
                <HorizontalBarChart
                  data={dashboard.byHospital}
                  barColor="#147471"
                  maxItems={6}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-gray-200 rounded-2xl">
              <CardHeader className="p-4 pb-0">
                <h3 className="ds-section-title">
                  Volume Diário de Solicitações
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Novas solicitações nos últimos 30 dias
                </p>
              </CardHeader>
              <CardContent className="p-4">
                <AreaLineChart data={temporalCountData} height={180} />
              </CardContent>
            </Card>

            <Card className="border border-gray-200 rounded-2xl">
              <CardHeader className="p-4 pb-0">
                <h3 className="ds-section-title">Procedimentos por Convênio</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ranking por volume de solicitações
                </p>
              </CardHeader>
              <CardContent className="p-4 pt-3">
                <HealthPlanTable
                  data={dashboard.byHealthPlan}
                  total={dashboard.total}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <DashboardFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(filters) => setDashboardFilters(filters)}
        onClear={() => setDashboardFilters(DEFAULT_DASHBOARD_FILTERS)}
        currentFilters={dashboardFilters}
      />
    </PageContainer>
  );
}
