"use client";

import { useState } from "react";
import Image from "next/image";
import PageContainer from "@/components/PageContainer";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

// Mock data para demonstração
const mockData = {
  totalSurgeries: 3,
  approvalRate: 87.5,
  averageCompletionTime: 12.3,
  pendingNotifications: 0,
  totalProcedures: 14,
  billedValue: 37237.0,
  receivedValue: 7121.0,
  toReceiveValue: 7121.0,
  expectedTotal: 44358.0,
  monthlyEvolution: [
    { month: "Ago/25", value: 207 },
    { month: "Set/25", value: 266 },
    { month: "Out/25", value: 299 },
    { month: "Nov/25", value: 281 },
    { month: "Dez/25", value: 336 },
    { month: "Jan/26", value: 250 },
  ],
  proceduresByHealthPlan: [
    { name: "Unimed", count: 5 },
    { name: "Bradesco Saúde", count: 1 },
    { name: "Amil", count: 6 },
  ],
};

// Componente de KPI Card
function KPICard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: string;
}) {
  return (
    <Card className="flex-1 border border-gray-200 rounded-xl">
      <CardHeader className="flex-row justify-between items-center p-4 pb-2 space-y-0">
        <span className="text-sm text-neutral-900">{title}</span>
        <Image src={icon} alt="" width={20} height={20} />
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="text-2xl font-light text-neutral-900 text-center tracking-tight">
          {value}
        </div>
        <p className="text-sm text-gray-500">{description}</p>
      </CardContent>
    </Card>
  );
}

// Componente do Donut Chart simplificado
function DonutChart({ total }: { total: number }) {
  // Segmentos do gráfico representando diferentes status
  const segments = [
    { value: 25, color: "#147471" },
    { value: 20, color: "#1a9391" },
    { value: 18, color: "#20b2b0" },
    { value: 15, color: "#2dd1cf" },
    { value: 12, color: "#5ee0de" },
    { value: 7, color: "#8eecea" },
    { value: 3, color: "#bef6f5" },
  ];

  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="-1 -1 2 2"
        width="200"
        height="200"
        className="transform -rotate-90"
      >
        {segments.map((segment, index) => {
          const startPercent = cumulativePercent;
          const segmentPercent = segment.value / 100;
          cumulativePercent += segmentPercent;

          const [startX, startY] = getCoordinatesForPercent(startPercent);
          const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
          const largeArcFlag = segmentPercent > 0.5 ? 1 : 0;

          const pathData = [
            `M ${startX * 0.6} ${startY * 0.6}`,
            `L ${startX} ${startY}`,
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `L ${endX * 0.6} ${endY * 0.6}`,
            `A 0.6 0.6 0 ${largeArcFlag} 0 ${startX * 0.6} ${startY * 0.6}`,
          ].join(" ");

          return <path key={index} d={pathData} fill={segment.color} />;
        })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-light text-neutral-900 tracking-tight">
          {total}
        </span>
        <span className="text-xs text-neutral-900">Procedimentos</span>
      </div>
    </div>
  );
}

// Componente de Barra Horizontal
function HorizontalBar({
  label,
  value,
  maxValue,
}: {
  label: string;
  value: number;
  maxValue: number;
}) {
  const percentage = (value / maxValue) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-10 text-right">{label}</span>
      <div
        className="flex-1 h-10 bg-teal-600 rounded-lg"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Componente de Financial Card
function FinancialCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <Card className="flex-1 border border-gray-200 rounded-xl">
      <CardHeader className="flex-row justify-between items-center p-4 pb-2 space-y-0">
        <span className="text-sm text-neutral-900">{title}</span>
        <Image src={icon} alt="" width={20} height={20} />
      </CardHeader>
      <CardContent className="p-4 flex items-center">
        <div className="text-2xl font-light text-neutral-900 tracking-tight">
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(value)}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de Line Chart simplificado
function LineChart() {
  const data = [
    { x: 0, y: 60 },
    { x: 20, y: 45 },
    { x: 40, y: 55 },
    { x: 60, y: 35 },
    { x: 80, y: 50 },
    { x: 100, y: 40 },
  ];

  const points = data.map((d) => `${d.x * 4.8},${100 - d.y}`).join(" ");
  const areaPath = `M0,100 L0,${100 - data[0].y} ${data.map((d) => `L${d.x * 4.8},${100 - d.y}`).join(" ")} L480,100 Z`;

  return (
    <svg viewBox="0 0 480 120" className="w-full h-32">
      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#147471" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#147471" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGradient)" />
      <polyline points={points} fill="none" stroke="#147471" strokeWidth="2" />
    </svg>
  );
}

export default function DashboardPage() {
  const [period] = useState("Últimos 7 dias");
  const maxBarValue = Math.max(
    ...mockData.monthlyEvolution.map((m) => m.value),
  );

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex justify-between items-center p-6 pb-6 pl-4 border-b border-gray-200">
        <h1 className="text-3xl font-semibold text-neutral-900">Dashboard</h1>
        <button className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
          <Image
            src="/icons/calendar-schedule.svg"
            alt=""
            width={24}
            height={24}
          />
          <span className="text-sm text-gray-500">{period}</span>
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <KPICard
            title="Total de Cirurgias"
            value={mockData.totalSurgeries}
            description="Procedimentos realizados"
            icon="/icons/status-surgeries.svg"
          />
          <KPICard
            title="Taxa de Aprovação"
            value={`${mockData.approvalRate}%`}
            description="Procedimentos aprovados"
            icon="/icons/checkmark-circle.svg"
          />
          <KPICard
            title="Tempo Médio de Conclusão"
            value={`${mockData.averageCompletionTime} dias`}
            description="Enviada → Finalizada"
            icon="/icons/alarm-clock-time.svg"
          />
          <KPICard
            title="Notificações Pendentes"
            value={mockData.pendingNotifications}
            description="Requerem atenção"
            icon="/icons/bell-notification.svg"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Donut Chart - Procedimentos por Status */}
          <Card className="border border-gray-200 rounded-xl">
            <CardHeader className="p-4">
              <h3 className="text-base font-semibold text-neutral-900">
                Procedimentos por Status
              </h3>
            </CardHeader>
            <CardContent className="flex items-center justify-center pb-6">
              <DonutChart total={mockData.totalProcedures} />
            </CardContent>
          </Card>

          {/* Bar Chart - Evolução Mensal */}
          <Card className="border border-gray-200 rounded-xl">
            <CardHeader className="p-4">
              <h3 className="text-base font-semibold text-neutral-900">
                Evolução Mensal - Procedimentos
              </h3>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex flex-col gap-2">
                {mockData.monthlyEvolution.map((item) => (
                  <HorizontalBar
                    key={item.month}
                    label={item.month}
                    value={item.value}
                    maxValue={maxBarValue}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1 mt-4 text-sm font-semibold text-gray-500">
                <span>Média de 8 procedimentos/mês</span>
                <Image
                  src="/icons/chart-up-arrow.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Resumo Financeiro */}
          <Card className="border border-gray-200 rounded-xl">
            <CardHeader className="p-4">
              <h3 className="text-base font-semibold text-neutral-900">
                Resumo Financeiro
              </h3>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-col gap-2">
                <FinancialCard
                  title="Valores Faturados"
                  value={mockData.billedValue}
                  icon="/icons/dollar-cash-circle.svg"
                />
                <FinancialCard
                  title="Valores Recebidos"
                  value={mockData.receivedValue}
                  icon="/icons/dollar-cash-circle.svg"
                />
                <FinancialCard
                  title="Valores a Receber"
                  value={mockData.toReceiveValue}
                  icon="/icons/dollar-cash-circle.svg"
                />
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Total previsto:{" "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(mockData.expectedTotal)}
              </p>
            </CardContent>
          </Card>

          {/* Faturamento */}
          <Card className="border border-gray-200 rounded-xl">
            <CardHeader className="p-4">
              <h3 className="text-base font-semibold text-neutral-900">
                Faturamento
              </h3>
            </CardHeader>
            <CardContent className="p-4 pt-0 pb-4">
              <LineChart />
              <div className="flex justify-between text-xs text-gray-500 mt-2 px-4">
                <span>11/01</span>
                <span>13/01</span>
                <span>15/01</span>
                <span>17/01</span>
              </div>
              <div className="flex items-center gap-1 mt-4 text-sm text-gray-500">
                <span>Últimos 7 dias: Crescimento positivo</span>
                <Image
                  src="/icons/chart-up-arrow.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Procedimentos por Convênio */}
        <Card className="border border-gray-200 rounded-xl">
          <CardHeader className="p-4">
            <h3 className="text-base font-semibold text-neutral-900">
              Procedimentos por Convênio
            </h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4">
              {/* Table Header */}
              <div className="grid grid-cols-2 border-b border-gray-200">
                <div className="p-2 text-base font-semibold text-neutral-900">
                  Convênio
                </div>
                <div className="p-2 text-base font-semibold text-neutral-900">
                  Procedimentos
                </div>
              </div>
              {/* Table Rows */}
              {mockData.proceduresByHealthPlan.map((item, index) => (
                <div
                  key={item.name}
                  className={`grid grid-cols-2 ${
                    index % 2 === 1 ? "bg-gray-100" : ""
                  }`}
                >
                  <div className="p-3 text-base text-neutral-800">
                    {item.name}
                  </div>
                  <div className="p-3 text-base text-neutral-800">
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
