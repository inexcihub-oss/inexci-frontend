"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { reportsService } from "@/services/reports.service";
import type {
  TemporalEvolutionData,
  MonthlyEvolutionData,
  AverageCompletionTimeData,
  PendingNotificationsData,
} from "@/services/reports.service";
import { STATUS_NUMBER_TO_STRING } from "@/services/surgery-request.service";
import { formatCurrency } from "@/lib/utils";

// ─── Constantes ─────────────────────────────────────────────────────────────

const STATUS_CHART_COLORS: Record<string, string> = {
  Pendente: "#f59e0b",
  Enviada: "#3b82f6",
  "Em Análise": "#eab308",
  "Em Agendamento": "#f97316",
  Agendada: "#14b8a6",
  Realizada: "#10b981",
  Faturada: "#6366f1",
  Finalizada: "#059669",
  Encerrada: "#6b7280",
};

const STATUS_ORDER = [
  { num: 1, label: "Pendente", color: "#f59e0b" },
  { num: 2, label: "Enviada", color: "#3b82f6" },
  { num: 3, label: "Em Análise", color: "#eab308" },
  { num: 4, label: "Em Agendamento", color: "#f97316" },
  { num: 5, label: "Agendada", color: "#14b8a6" },
  { num: 6, label: "Realizada", color: "#10b981" },
  { num: 7, label: "Faturada", color: "#6366f1" },
  { num: 8, label: "Finalizada", color: "#059669" },
  { num: 9, label: "Encerrada", color: "#6b7280" },
] as const;

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface ProcessedDashboard {
  total: number;
  totalAuthorized: number;
  totalScheduled: number;
  totalDone: number;
  totalInvoiced: number;
  totalReceived: number;
  toReceive: number;
  approvalRate: number;
  avgCompletionDays: number;
  pendingNotifications: PendingNotificationsData;
  byStatus: Array<{
    status: number;
    label: string;
    total: number;
    color: string;
  }>;
  byHealthPlan: Array<{ name: string; count: number }>;
  byHospital: Array<{ name: string; count: number }>;
  temporalData: Array<{ date: string; count: number; invoiced: number }>;
  monthlyEvolution: MonthlyEvolutionData[];
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}) {
  const trendColors = {
    up: "text-emerald-600 bg-emerald-50",
    down: "text-red-600 bg-red-50",
    neutral: "text-gray-500 bg-gray-50",
  };

  return (
    <Card className="border border-gray-200 rounded-2xl hover:shadow-md transition-shadow">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-gray-50 rounded-xl">
            <Image
              src={icon}
              alt=""
              width={20}
              height={20}
              className="opacity-70"
            />
          </div>
          {trend && trendLabel && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${trendColors[trend]}`}
            >
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendLabel}
            </span>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
          {value}
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Financial KPI Card ─────────────────────────────────────────────────────

function FinancialKPICard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: "green" | "blue" | "amber";
}) {
  const colorMap = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };

  const iconBgMap = {
    green: "bg-emerald-100",
    blue: "bg-blue-100",
    amber: "bg-amber-100",
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl border ${colorMap[color]}`}
    >
      <div className={`p-2.5 rounded-lg ${iconBgMap[color]}`}>
        <Image src={icon} alt="" width={20} height={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium opacity-80">{title}</p>
        <p className="text-xl font-semibold tracking-tight truncate">
          {formatCurrency(value)}
        </p>
      </div>
    </div>
  );
}

// ─── Pipeline de Status ─────────────────────────────────────────────────────

function StatusPipeline({
  byStatus,
  total,
}: {
  byStatus: ProcessedDashboard["byStatus"];
  total: number;
}) {
  const statusMap = new Map(byStatus.map((s) => [s.status, s.total]));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-gray-100">
        {STATUS_ORDER.map((s) => {
          const count = statusMap.get(s.num) || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={s.num}
              className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${pct}%`,
                backgroundColor: s.color,
                minWidth: pct > 0 ? "4px" : "0",
              }}
              title={`${s.label}: ${count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {STATUS_ORDER.map((s) => {
          const count = statusMap.get(s.num) || 0;
          return (
            <div key={s.num} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-gray-600">{s.label}</span>
              <span className="font-semibold text-gray-800">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Donut Chart ────────────────────────────────────────────────────────────

function DonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  centerLabel: string;
  centerValue: string | number;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-gray-400 text-sm">Nenhum dado</span>
      </div>
    );
  }

  let cumulativePercent = 0;
  const getCoord = (pct: number) => [
    Math.cos(2 * Math.PI * pct),
    Math.sin(2 * Math.PI * pct),
  ];

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="-1.1 -1.1 2.2 2.2"
        width="180"
        height="180"
        className="transform -rotate-90"
      >
        {data
          .filter((seg) => seg.value > 0)
          .map((segment, index) => {
            const startPercent = cumulativePercent;
            const segmentPercent = segment.value / total;
            cumulativePercent += segmentPercent;

            const [startX, startY] = getCoord(startPercent);
            const [endX, endY] = getCoord(cumulativePercent);
            const largeArc = segmentPercent > 0.5 ? 1 : 0;
            const inner = 0.62;

            const pathData = [
              `M ${startX * inner} ${startY * inner}`,
              `L ${startX} ${startY}`,
              `A 1 1 0 ${largeArc} 1 ${endX} ${endY}`,
              `L ${endX * inner} ${endY * inner}`,
              `A ${inner} ${inner} 0 ${largeArc} 0 ${startX * inner} ${startY * inner}`,
            ].join(" ");

            return (
              <path
                key={index}
                d={pathData}
                fill={segment.color}
                className="transition-opacity hover:opacity-80"
              />
            );
          })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-semibold text-neutral-900 tracking-tight">
          {centerValue}
        </span>
        <span className="text-xs text-gray-500">{centerLabel}</span>
      </div>
    </div>
  );
}

// ─── Horizontal Bar Chart ───────────────────────────────────────────────────

function HorizontalBarChart({
  data,
  barColor = "#147471",
  maxItems = 6,
}: {
  data: Array<{ name: string; count: number }>;
  barColor?: string;
  maxItems?: number;
}) {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, maxItems);
  const maxValue = Math.max(...sorted.map((d) => d.count), 1);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-400 text-sm">Nenhum dado</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {sorted.map((item, idx) => {
        const pct = (item.count / maxValue) * 100;
        return (
          <div key={idx} className="flex items-center gap-3">
            <span
              className="text-sm text-gray-700 font-medium truncate"
              style={{ width: "120px", minWidth: "120px" }}
              title={item.name}
            >
              {item.name || "Sem nome"}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-800 w-8 text-right">
              {item.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Monthly Bar Chart ──────────────────────────────────────────────────────

function MonthlyBarChart({ data }: { data: MonthlyEvolutionData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-44">
        <span className="text-gray-400 text-sm">Nenhum dado</span>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-2 h-44 px-2">
      {data.map((item, idx) => {
        const heightPct = (item.count / maxCount) * 100;
        const isLast = idx === data.length - 1;
        return (
          <div
            key={idx}
            className="flex-1 flex flex-col items-center gap-1 min-w-0"
          >
            <span className="text-xs font-semibold text-gray-800">
              {item.count}
            </span>
            <div className="w-full flex justify-center">
              <div
                className="w-full max-w-[40px] rounded-t-md transition-all duration-500"
                style={{
                  height: `${Math.max(heightPct, 4)}%`,
                  backgroundColor: isLast ? "#147471" : "#a7d8d6",
                  minHeight: "4px",
                }}
              />
            </div>
            <span className="text-xs text-gray-500 truncate w-full text-center">
              {item.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Area Line Chart ────────────────────────────────────────────────────────

function AreaLineChart({
  data,
  height = 140,
}: {
  data: Array<{ date: string; value: number }>;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span className="text-gray-400 text-sm">Dados insuficientes</span>
      </div>
    );
  }

  const width = 480;
  const pad = { top: 10, right: 10, bottom: 30, left: 10 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * chartW,
    y: pad.top + chartH - ((d.value - minVal) / range) * chartH,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${pad.top + chartH} L ${points[0].x} ${pad.top + chartH} Z`;

  const fmtLabel = (dateStr: string) => {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id="dashAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#147471" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#147471" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0.25, 0.5, 0.75].map((pct) => (
        <line
          key={pct}
          x1={pad.left}
          y1={pad.top + chartH * (1 - pct)}
          x2={pad.left + chartW}
          y2={pad.top + chartH * (1 - pct)}
          stroke="#f3f4f6"
          strokeDasharray="4 4"
        />
      ))}
      <path d={areaPath} fill="url(#dashAreaGradient)" />
      <path
        d={linePath}
        fill="none"
        stroke="#147471"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Pontos de destaque */}
      {[0, Math.floor(points.length / 2), points.length - 1].map((idx) => (
        <circle
          key={idx}
          cx={points[idx].x}
          cy={points[idx].y}
          r="3.5"
          fill="#147471"
          stroke="white"
          strokeWidth="2"
        />
      ))}
      {/* Labels do eixo X */}
      <text
        x={pad.left}
        y={height - 4}
        fontSize="11"
        fill="#9ca3af"
        textAnchor="start"
      >
        {fmtLabel(data[0].date)}
      </text>
      <text
        x={pad.left + chartW / 2}
        y={height - 4}
        fontSize="11"
        fill="#9ca3af"
        textAnchor="middle"
      >
        {fmtLabel(data[Math.floor(data.length / 2)].date)}
      </text>
      <text
        x={pad.left + chartW}
        y={height - 4}
        fontSize="11"
        fill="#9ca3af"
        textAnchor="end"
      >
        {fmtLabel(data[data.length - 1].date)}
      </text>
    </svg>
  );
}

// ─── Alert Card ─────────────────────────────────────────────────────────────

function AlertCard({
  title,
  count,
  description,
  color,
  icon,
}: {
  title: string;
  count: number;
  description: string;
  color: "amber" | "red" | "blue";
  icon: string;
}) {
  const colorMap = {
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
    blue: "border-blue-200 bg-blue-50",
  };
  const textMap = {
    amber: "text-amber-800",
    red: "text-red-800",
    blue: "text-blue-800",
  };
  const badgeMap = {
    amber: "bg-amber-200 text-amber-800",
    red: "bg-red-200 text-red-800",
    blue: "bg-blue-200 text-blue-800",
  };

  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-2xl border ${colorMap[color]}`}
    >
      <Image src={icon} alt="" width={18} height={18} className="opacity-70" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textMap[color]}`}>{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <span
        className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${badgeMap[color]}`}
      >
        {count}
      </span>
    </div>
  );
}

// ─── Health Plan Table ──────────────────────────────────────────────────────

function HealthPlanTable({
  data,
  total,
}: {
  data: Array<{ name: string; count: number }>;
  total: number;
}) {
  const sorted = [...data].sort((a, b) => b.count - a.count);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-400 text-sm">Nenhum dado</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <div className="grid grid-cols-[1fr_80px_80px] gap-0 px-4 py-2.5 bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Convênio
        </span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
          Qtd
        </span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
          %
        </span>
      </div>
      {sorted.map((item, idx) => {
        const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";
        return (
          <div
            key={item.name || idx}
            className={`grid grid-cols-[1fr_80px_80px] gap-0 px-4 py-2.5 border-t border-gray-100 ${
              idx % 2 === 1 ? "bg-gray-50/40" : ""
            }`}
          >
            <span className="text-sm text-gray-800 font-medium truncate">
              {item.name || "Sem nome"}
            </span>
            <span className="text-sm text-gray-700 text-right font-semibold">
              {item.count}
            </span>
            <span className="text-sm text-gray-500 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<ProcessedDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        dashData,
        evolutionData,
        monthlyData,
        avgTimeData,
        notificationsData,
      ] = await Promise.all([
        reportsService.getDashboard(),
        reportsService
          .getTemporalEvolution(30)
          .catch(() => [] as TemporalEvolutionData[]),
        reportsService
          .getMonthlyEvolution(6)
          .catch(() => [] as MonthlyEvolutionData[]),
        reportsService
          .getAverageCompletionTime()
          .catch(() => ({ average_days: 0 }) as AverageCompletionTimeData),
        reportsService.getPendingNotifications().catch(
          () =>
            ({
              total: 0,
              pending_analysis: 0,
              pending_scheduling: 0,
            }) as PendingNotificationsData,
        ),
      ]);

      const totalInvoiced =
        Number(dashData.surgery_request.total_invoiced_value) || 0;
      const totalReceived =
        Number(dashData.surgery_request.total_received_value) || 0;

      // Calcular "autorizadas" = agendadas + realizadas + faturadas + finalizadas + encerradas
      // (tudo que passou da análise)
      const statusTotals = new Map(
        dashData.surgery_request.total_by_status.map((s) => [
          s.status,
          s.total,
        ]),
      );
      const totalAuthorized =
        (statusTotals.get(4) || 0) + // Em Agendamento
        (statusTotals.get(5) || 0) + // Agendada
        (statusTotals.get(6) || 0) + // Realizada
        (statusTotals.get(7) || 0) + // Faturada
        (statusTotals.get(8) || 0) + // Finalizada
        (statusTotals.get(9) || 0); // Encerrada

      const processed: ProcessedDashboard = {
        total: dashData.surgery_request.total,
        totalAuthorized,
        totalScheduled: dashData.surgery_request.total_scheduled,
        totalDone: dashData.surgery_request.total_performed,
        totalInvoiced,
        totalReceived,
        toReceive: totalInvoiced - totalReceived,
        approvalRate:
          dashData.surgery_request.total > 0
            ? (totalAuthorized / dashData.surgery_request.total) * 100
            : 0,
        avgCompletionDays: avgTimeData.average_days,
        pendingNotifications: notificationsData,
        byStatus: dashData.surgery_request.total_by_status.map((item) => {
          const label = STATUS_NUMBER_TO_STRING[item.status] || "Desconhecido";
          return {
            status: item.status,
            label,
            total: item.total,
            color: STATUS_CHART_COLORS[label] || "#6b7280",
          };
        }),
        byHealthPlan: dashData.surgery_request.total_by_health_plan.map(
          (item) => ({
            name: item.health_plan_name,
            count: item.total,
          }),
        ),
        byHospital: dashData.surgery_request.total_by_hospital.map((item) => ({
          name: item.hospital_name,
          count: item.total,
        })),
        temporalData: evolutionData.map((item) => ({
          date: item.date,
          count: parseInt(item.count) || 0,
          invoiced: parseFloat(item.invoiced_value || "0"),
        })),
        monthlyEvolution: monthlyData,
      };

      setDashboard(processed);
    } catch (err: unknown) {
      console.error("Erro ao carregar dashboard:", err);
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        e.response?.data?.message ||
          e.message ||
          "Erro ao carregar dados do dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Dados derivados ───────────────────────────────────────────────────

  const activeRequests = useMemo(() => {
    if (!dashboard) return 0;
    return dashboard.byStatus
      .filter((s) => ![8, 9].includes(s.status))
      .reduce((sum, s) => sum + s.total, 0);
  }, [dashboard]);

  const pendingCount = useMemo(
    () => dashboard?.byStatus.find((s) => s.status === 1)?.total || 0,
    [dashboard],
  );

  const invoicedCount = useMemo(
    () => dashboard?.byStatus.find((s) => s.status === 7)?.total || 0,
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

  // ─── Loading ──────────────────────────────────────────────────────────

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

  // ─── Erro ─────────────────────────────────────────────────────────────

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
              onClick={loadDashboard}
              className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex justify-between items-center px-4 lg:px-6 py-4 lg:py-5 border-b border-gray-200">
        <div>
          <h1 className="ds-page-title">Dashboard</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Visão geral das solicitações cirúrgicas
          </p>
        </div>
        <Link
          href="/solicitacoes-cirurgicas"
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors min-h-[44px] active:scale-[0.98]"
        >
          <Image
            src="/icons/grid-layout.svg"
            alt=""
            width={16}
            height={16}
            className="brightness-0 invert"
          />
          Ver Kanban
        </Link>
      </div>

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
          {/* ── KPI Cards ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard
              title="Total de Solicitações"
              value={dashboard.total}
              icon="/icons/status-surgeries.svg"
              subtitle={`${activeRequests} ativas`}
            />
            <KPICard
              title="Pendentes"
              value={pendingCount}
              icon="/icons/clock.svg"
              subtitle="Aguardando envio"
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
            />
            <KPICard
              title="Realizadas"
              value={dashboard.totalDone}
              icon="/icons/checkbox.svg"
              subtitle="Cirurgias concluídas"
            />
            <KPICard
              title="Tempo Médio"
              value={`${dashboard.avgCompletionDays.toFixed(0)}d`}
              icon="/icons/alarm-clock-time.svg"
              subtitle="Envio → Finalização"
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
            />
          </div>

          {/* ── Pipeline de Status ─────────────────────────────────── */}
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

          {/* ── Resumo Financeiro ──────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* ── Alertas ────────────────────────────────────────────── */}
          {hasAlerts && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.pendingNotifications.pending_analysis > 0 && (
                <AlertCard
                  title="Em Análise há mais de 5 dias"
                  count={dashboard.pendingNotifications.pending_analysis}
                  description="Aguardando resposta da operadora"
                  color="amber"
                  icon="/icons/warning.svg"
                />
              )}
              {dashboard.pendingNotifications.pending_scheduling > 0 && (
                <AlertCard
                  title="Em Agendamento há mais de 5 dias"
                  count={dashboard.pendingNotifications.pending_scheduling}
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

          {/* ── Gráficos: Status + Faturamento ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut: Por Status */}
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

            {/* Linha: Evolução de Faturamento */}
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

          {/* ── Evolução Mensal + Por Hospital ─────────────────────── */}
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

          {/* ── Volume Diário + Convênios ──────────────────────────── */}
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
    </PageContainer>
  );
}
