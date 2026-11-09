"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import PageContainer from "@/components/PageContainer";
import {
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatTrendBadge,
  AdminIconChip,
  type AdminAccent,
} from "@/components/admin/AdminStatCard";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bug,
  Bot,
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Filter,
  Hourglass,
  LineChart,
  PieChart,
  ReceiptText,
  Repeat,
  Rocket,
  Timer,
  TriangleAlert,
  KeyRound,
  UserMinus,
  UserPlus,
  UserX,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AccountsAtRiskSection } from "@/components/admin/health/AccountsAtRiskSection";
import { AreaLineChart } from "@/components/dashboard/charts/AreaLineChart";
import { DonutChart } from "@/components/dashboard/charts/DonutChart";
import { HorizontalBarChart } from "@/components/dashboard/charts/HorizontalBarChart";
import { MonthlyBarChart } from "@/components/dashboard/charts/MonthlyBarChart";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  formatBrlCents,
  formatMonthLabel,
  formatUsdCents,
  pluralize,
} from "@/lib/admin-format";
import { adminKeys } from "@/lib/query-keys";
import { formatDays } from "@/lib/admin-activation";
import {
  adminService,
  type AdminMetricsOverview,
  type AdminMetricsPeriod,
} from "@/services/admin.service";
import { cn } from "@/lib/utils";

const PERIODS: Array<{
  id: AdminMetricsPeriod;
  label: string;
  description: string;
}> = [
  { id: "30d", label: "30 dias", description: "Últimos 30 dias" },
  { id: "90d", label: "90 dias", description: "Últimos 90 dias" },
  { id: "12m", label: "12 meses", description: "Últimos 12 meses" },
];

const NO_HISTORY = "Sem histórico suficiente";
const PLAN_COLORS = [
  "#147471",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#10b981",
  "#6366f1",
  "#ec4899",
  "#64748b",
];

function formatPercent(value: number): string {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function ChartCard({
  title,
  subtitle,
  icon,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  accent: AdminAccent;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="h-full min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <header className="flex items-center gap-2.5 border-b border-neutral-100 px-4 py-3">
        <AdminIconChip icon={icon} accent={accent} size="sm" />
        <div className="min-w-0">
          <h3 className="ds-section-title">{title}</h3>
          {subtitle && <p className="ds-caption mt-0.5">{subtitle}</p>}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

const ATTENTION_STYLES = {
  amber: {
    active: "border-amber-200 bg-amber-50 hover:bg-amber-100/70",
    chip: "bg-amber-100 text-amber-700",
    count: "bg-amber-500 text-white",
    title: "text-amber-900",
  },
  red: {
    active: "border-red-200 bg-red-50 hover:bg-red-100/70",
    chip: "bg-red-100 text-red-700",
    count: "bg-red-500 text-white",
    title: "text-red-900",
  },
  blue: {
    active: "border-blue-200 bg-blue-50 hover:bg-blue-100/70",
    chip: "bg-blue-100 text-blue-700",
    count: "bg-blue-500 text-white",
    title: "text-blue-900",
  },
} as const;

function AttentionCard({
  title,
  label,
  description,
  count,
  tone,
  icon: Icon,
  href,
}: {
  title: string;
  label: string;
  description: string;
  count: number;
  tone: keyof typeof ATTENTION_STYLES;
  icon: LucideIcon;
  href: string;
}) {
  const styles = ATTENTION_STYLES[tone];
  const active = count > 0;
  return (
    <Link
      href={href}
      aria-label={title}
      className={cn(
        "group flex h-full min-w-0 flex-col rounded-2xl border p-3.5 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:p-4",
        active ? styles.active : "border-gray-200 bg-white hover:bg-gray-50",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9",
            active ? styles.chip : "bg-gray-100 text-gray-500",
          )}
        >
          <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </span>
        <ChevronRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
        />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "mt-3 block text-2xl font-semibold tabular-nums leading-none sm:text-[28px]",
          active ? styles.title : "text-gray-400",
        )}
      >
        {count}
      </span>
      <span
        className={cn(
          "mt-2 block text-sm font-medium leading-snug",
          active ? styles.title : "text-gray-900",
        )}
      >
        {label}
      </span>
      <span className="mt-1 block text-xs leading-snug text-gray-500">
        {description}
      </span>
    </Link>
  );
}

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

function Funnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step) => (
        <li key={step.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs font-medium text-gray-700 sm:w-36 sm:text-sm">
            {step.label}
          </span>
          <div className="h-6 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(step.value / max) * 100}%`,
                backgroundColor: step.color,
              }}
            />
          </div>
          <span className="min-w-8 text-right text-sm font-semibold text-gray-800">
            {step.value}
          </span>
        </li>
      ))}
    </ol>
  );
}

function TrialFunnel({
  funnel,
}: {
  funnel: AdminMetricsOverview["series"]["trialFunnel"];
}) {
  return (
    <Funnel
      steps={[
        { label: "Trials iniciados", value: funnel.started, color: "#a7d8d6" },
        { label: "Com cartão", value: funnel.withCard, color: "#4fb0ac" },
        { label: "Convertidos", value: funnel.converted, color: "#147471" },
      ]}
    />
  );
}

function ActivationSection({
  activation,
  periodLabel,
}: {
  activation: AdminMetricsOverview["activation"];
  periodLabel: string;
}) {
  return (
    <AdminSection
      title="Ativação de novas contas"
      accent="emerald"
      description={`Contas cadastradas nos ${periodLabel.toLowerCase()}: quantas já usaram a plataforma de verdade`}
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            icon={Rocket}
            accent="emerald"
            title="Do cadastro à primeira consulta ou solicitação"
            subtitle={
              activation.activationRatePercent === null
                ? "Nenhuma conta cadastrada no período"
                : `${formatPercent(activation.activationRatePercent)} das contas ativaram`
            }
          >
            <Funnel
              steps={[
                {
                  label: "Cadastros",
                  value: activation.cohortAccounts,
                  color: "#a7f3d0",
                },
                {
                  label: "Com 1º paciente",
                  value: activation.withFirstPatient,
                  color: "#34d399",
                },
                {
                  label: "Com 1ª consulta ou SC",
                  value: activation.activated,
                  color: "#047857",
                },
              ]}
            />
          </ChartCard>
        </div>
        <AdminStatCard
          icon={Timer}
          accent="emerald"
          label="Tempo até ativar"
          value={formatDays(activation.averageDaysToActivate)}
          hint="Média de dias entre o cadastro e a primeira consulta ou solicitação"
          footnote={`Mediana: ${formatDays(activation.medianDaysToActivate)}`}
        />
      </div>
    </AdminSection>
  );
}

function securityAlert(security: AdminMetricsOverview["security"]) {
  const accounts = security.accountsWithSpike24h;
  const platformOnly = security.platformSpike && accounts === 0;
  return {
    title: platformOnly
      ? `${security.platformTotal24h} falhas de login na plataforma`
      : `${accounts} ${accounts === 1 ? "conta com pico" : "contas com pico"} de falhas de login`,
    label: platformOnly
      ? "Falhas de login na plataforma"
      : "Contas com pico de falhas de login",
    description: platformOnly
      ? "Nas últimas 24\u00a0h; pode ser tentativa de ataque"
      : `${security.accountThreshold} ou mais falhas nas últimas 24\u00a0h`,
    count: platformOnly ? security.platformTotal24h : accounts,
    tone: "red" as const,
    icon: KeyRound,
    href: "/admin/seguranca?periodo=1",
  };
}

function Dashboard({
  data,
  periodLabel,
}: {
  data: AdminMetricsOverview;
  periodLabel: string;
}) {
  const { revenue, trials, churn, engagement, accounts, series, ai } = data;
  const conversion = trials.conversion90d;
  const churnRate = churn.accountsRatePercent;
  const change = revenue.mrrChangePercent;

  const mrrPoints = series.mrrMonthly
    .filter((p) => p.mrrCents !== null)
    .map((p) => ({ date: `${p.month}-01`, value: p.mrrCents as number }));

  const planSlices = series.accountsByPlan.map((p, i) => ({
    label: `${p.planName} (${p.billingPeriod === "YEARLY" ? "anual" : "mensal"})`,
    value: p.accounts,
    color: PLAN_COLORS[i % PLAN_COLORS.length],
  }));

  const payingTotal = planSlices.reduce((sum, p) => sum + p.value, 0);

  const alerts = [
    {
      title: `${trials.endingIn7Days} ${trials.endingIn7Days === 1 ? "trial termina" : "trials terminam"} esta semana`,
      label: "Trials terminando esta semana",
      description: "Testes grátis que acabam em até 7 dias",
      count: trials.endingIn7Days,
      tone: "amber" as const,
      icon: Hourglass,
      href: "/admin/clientes?trial=7",
    },
    {
      title: `${revenue.delinquentAccounts} ${revenue.delinquentAccounts === 1 ? "conta inadimplente" : "contas inadimplentes"}`,
      label: "Contas inadimplentes",
      description: "Com pagamento em atraso",
      count: revenue.delinquentAccounts,
      tone: "red" as const,
      icon: TriangleAlert,
      href: "/admin/clientes?situacao=past_due",
    },
    {
      title: `${engagement.inactiveAccounts7d} ${engagement.inactiveAccounts7d === 1 ? "conta sem acesso" : "contas sem acesso"} há 7 dias`,
      label: "Contas sem acesso há 7 dias",
      description: "Risco de abandono",
      count: engagement.inactiveAccounts7d,
      tone: "blue" as const,
      icon: UserX,
      href: "/admin/clientes?inativos=7",
    },
    {
      title: `${data.errors.accountsWithSpike24h} ${data.errors.accountsWithSpike24h === 1 ? "conta com pico" : "contas com pico"} de erros`,
      label: "Contas com pico de erros",
      description: `${data.errors.spikeThreshold} ou mais erros nas últimas 24\u00a0h`,
      count: data.errors.accountsWithSpike24h,
      tone: "red" as const,
      icon: Bug,
      href: "/admin/erros?periodo=1",
    },
    securityAlert(data.security),
  ];

  return (
    <div className="space-y-6">
      <AdminSection title="Precisa de atenção" accent="amber">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {alerts.map((a) => (
            <AttentionCard key={a.href} {...a} />
          ))}
        </div>
      </AdminSection>

      <AccountsAtRiskSection atRisk={data.accountsAtRisk} />

      <AdminSection
        title="Receita"
        description="Valores em reais"
        accent="emerald"
      >
        <AdminStatGrid columns={4}>
          <AdminStatCard
            icon={Repeat}
            accent="emerald"
            label="Receita recorrente mensal (MRR)"
            value={formatBrlCents(revenue.mrrCents)}
            hint="Quanto as assinaturas ativas pagam por mês"
            badge={
              change === null ? undefined : (
                <AdminStatTrendBadge
                  trend={change > 0 ? "up" : change < 0 ? "down" : "neutral"}
                >
                  {formatPercent(change)}
                </AdminStatTrendBadge>
              )
            }
            footnote={
              change === null
                ? `${NO_HISTORY} para comparar`
                : `Variação em relação ao início do período (${periodLabel.toLowerCase()})`
            }
          />
          <AdminStatCard
            icon={Wallet}
            accent="emerald"
            label={`Recebido em ${formatMonthLabel(revenue.month)}`}
            value={formatBrlCents(revenue.receivedThisMonthCents)}
            hint="Faturas pagas no mês atual"
          />
          <AdminStatCard
            icon={CalendarClock}
            accent="emerald"
            label={`Previsão para ${formatMonthLabel(revenue.nextMonth)}`}
            value={formatBrlCents(revenue.nextMonthForecastCents)}
            hint="Assinaturas ativas e trials com cartão que devem converter"
            badge={
              revenue.nextMonthForecastIsEstimate ? (
                <span className="ds-badge-sm shrink-0 bg-gray-100 text-gray-600">
                  Estimativa
                </span>
              ) : undefined
            }
            footnote={
              <Link
                href="/admin/faturamento?tab=previsao"
                className="font-medium text-primary-700 hover:underline"
              >
                Ver previsão detalhada
              </Link>
            }
          />
          <AdminStatCard
            icon={ReceiptText}
            accent="emerald"
            label="Inadimplência"
            value={formatBrlCents(revenue.delinquentCents)}
            tone={revenue.delinquentCents > 0 ? "danger" : "default"}
            hint="Valor em atraso de faturas não pagas"
            footnote={pluralize(
              revenue.delinquentAccounts,
              "conta em atraso",
              "contas em atraso",
            )}
          />
        </AdminStatGrid>
      </AdminSection>

      <AdminSection title="Clientes" accent="blue">
        <AdminStatGrid columns={4}>
          <AdminStatCard
            icon={CreditCard}
            accent="blue"
            label="Contas pagantes"
            value={revenue.payingAccounts}
            hint="Com assinatura ativa"
            footnote={`${accounts.total} contas no total`}
          />
          <AdminStatCard
            icon={Hourglass}
            accent="blue"
            label="Trials ativos"
            value={trials.active}
            hint="Contas no período de teste grátis"
            footnote={pluralize(
              trials.expired,
              "trial vencido",
              "trials vencidos",
            )}
          />
          <AdminStatCard
            icon={BadgeCheck}
            accent="blue"
            label="Conversão do trial"
            value={
              conversion.ratePercent === null
                ? "—"
                : formatPercent(conversion.ratePercent)
            }
            hint="Trials dos últimos 90 dias que viraram assinatura"
            footnote={
              conversion.ratePercent === null
                ? NO_HISTORY
                : `${conversion.converted} de ${conversion.started} trials`
            }
          />
          <AdminStatCard
            icon={UserMinus}
            accent="blue"
            label="Cancelamentos no mês (churn)"
            value={churnRate === null ? "—" : formatPercent(churnRate)}
            tone={churnRate !== null && churnRate > 0 ? "warning" : "default"}
            hint="Parte das contas pagantes que cancelou no mês"
            footnote={
              churnRate === null
                ? NO_HISTORY
                : pluralize(
                    churn.canceledAccounts,
                    "conta cancelada",
                    "contas canceladas",
                  )
            }
          />
        </AdminStatGrid>
      </AdminSection>

      <AdminSection
        title="Uso da plataforma"
        accent="violet"
        description={`Contagens dos ${periodLabel.toLowerCase()}`}
      >
        <AdminStatGrid columns={5}>
          <AdminStatCard
            icon={Activity}
            accent="violet"
            className="min-[420px]:col-span-2 sm:col-span-2 lg:col-span-1"
            label="Contas ativas"
            value={engagement.activeAccounts30d}
            hint="Acessaram nos últimos 30 dias"
            footnote={`${engagement.activeAccounts7d} nos últimos 7 dias`}
          />
          <AdminStatCard
            icon={UserPlus}
            accent="violet"
            label="Novas assinaturas"
            value={accounts.newInPeriod}
            hint="Assinaturas criadas no período"
          />
          <AdminStatCard
            icon={ClipboardList}
            accent="violet"
            label="Solicitações cirúrgicas"
            value={engagement.surgeryRequestsCreated}
            hint="Criadas no período"
          />
          <AdminStatCard
            icon={CalendarCheck}
            accent="violet"
            label="Consultas"
            value={engagement.appointments}
            hint="Com data marcada no período"
          />
          <AdminStatCard
            icon={Users}
            accent="violet"
            label="Pacientes"
            value={engagement.patientsCreated}
            hint="Cadastrados no período"
          />
        </AdminStatGrid>
      </AdminSection>

      <ActivationSection
        activation={data.activation}
        periodLabel={periodLabel}
      />

      <AdminSection title="Evolução" accent="teal">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            icon={LineChart}
            accent="emerald"
            title="Receita recorrente mensal (MRR)"
            subtitle="Últimos 12 meses"
          >
            <table className="sr-only">
              <caption>MRR mensal</caption>
              <thead>
                <tr>
                  <th scope="col">Mês</th>
                  <th scope="col">MRR</th>
                </tr>
              </thead>
              <tbody>
                {series.mrrMonthly.map((p) => (
                  <tr key={p.month}>
                    <th scope="row">{formatMonthLabel(p.month)}</th>
                    <td>
                      {p.mrrCents === null ? "—" : formatBrlCents(p.mrrCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div aria-hidden="true">
              <AreaLineChart
                data={mrrPoints}
                height={180}
                formatLabel={(d) => formatMonthLabel(d.slice(0, 7))}
              />
            </div>
          </ChartCard>

          <ChartCard
            icon={PieChart}
            accent="blue"
            title="Contas por plano"
            subtitle="Assinaturas ativas hoje"
          >
            {planSlices.length === 0 ? (
              <p className="ds-caption py-8 text-center">
                Nenhuma assinatura ativa.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <DonutChart
                  data={planSlices}
                  centerLabel="contas"
                  centerValue={payingTotal}
                />
                <ul className="flex w-full flex-col gap-1.5 text-sm text-gray-700 sm:w-auto">
                  {planSlices.map((p) => (
                    <li key={p.label} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="min-w-0 flex-1">{p.label}</span>
                      <span className="font-semibold">{p.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ChartCard>

          <ChartCard
            icon={BarChart3}
            accent="violet"
            title="Novas contas"
            subtitle="Por mês"
          >
            <table className="sr-only">
              <caption>Novas contas e cancelamentos por mês</caption>
              <thead>
                <tr>
                  <th scope="col">Mês</th>
                  <th scope="col">Novas</th>
                  <th scope="col">Canceladas</th>
                </tr>
              </thead>
              <tbody>
                {series.newVsCanceled.map((p) => (
                  <tr key={p.month}>
                    <th scope="row">{formatMonthLabel(p.month)}</th>
                    <td>{p.newAccounts}</td>
                    <td>{p.canceledAccounts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <MonthlyBarChart
              data={series.newVsCanceled.map((p) => ({
                month: formatMonthLabel(p.month),
                count: p.newAccounts,
              }))}
            />
          </ChartCard>

          <ChartCard
            icon={UserMinus}
            accent="red"
            title="Cancelamentos"
            subtitle="Por mês"
          >
            <MonthlyBarChart
              data={series.newVsCanceled.map((p) => ({
                month: formatMonthLabel(p.month),
                count: p.canceledAccounts,
              }))}
            />
          </ChartCard>

          <ChartCard
            icon={Filter}
            accent="amber"
            title="Funil do trial"
            subtitle={`Trials iniciados nos ${periodLabel.toLowerCase()}`}
          >
            <TrialFunnel funnel={series.trialFunnel} />
          </ChartCard>

          <ChartCard
            icon={Bot}
            accent="teal"
            title="Contas com maior custo de IA"
            subtitle={`Mês atual, em US$ · média por conta ativa: ${
              ai.averageCostPerActiveAccountUsdCents === null
                ? "—"
                : formatUsdCents(ai.averageCostPerActiveAccountUsdCents)
            }`}
          >
            <HorizontalBarChart
              data={ai.topAccounts.map((a) => ({
                name: a.name,
                count: a.costUsdCents,
              }))}
              maxItems={5}
              formatValue={formatUsdCents}
            />
          </ChartCard>
        </div>
      </AdminSection>
    </div>
  );
}

export function AdminDashboard() {
  const [period, setPeriod] = useState<AdminMetricsPeriod>("30d");
  const periodLabel =
    PERIODS.find((p) => p.id === period)?.description ?? "Últimos 30 dias";

  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.metricsOverview(period),
    queryFn: () => adminService.getMetricsOverview(period),
    placeholderData: (previous) => previous,
  });

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-neutral-900">Dashboard</h1>
            <p className="text-xs text-neutral-500">
              Visão geral da plataforma
            </p>
          </div>
          <div role="group" aria-label="Período" className="ds-segmented">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={period === p.id}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  "ds-segmented-item whitespace-nowrap",
                  period === p.id && "ds-segmented-item-active",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-3 lg:p-6">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : isError || !data ? (
            <EmptyState
              title="Não foi possível carregar o dashboard"
              description="Tente novamente em instantes."
            />
          ) : (
            <Dashboard data={data} periodLabel={periodLabel} />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
