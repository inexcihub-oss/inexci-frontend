import {
  CalendarCheck,
  ClipboardList,
  Gauge,
  Stethoscope,
  Users,
  UsersRound,
} from "lucide-react";
import { AdminStatCard, AdminStatGrid } from "@/components/admin/AdminStatCard";
import { MonthlyBarChart } from "@/components/dashboard/charts/MonthlyBarChart";
import { AccountHealthCard } from "@/components/admin/health/AccountHealthCard";
import { formatQuota } from "@/lib/admin-format";
import type { AdminAccountDetail } from "@/services/admin.service";

function weekLabel(weekStart: string): string {
  const [, month, day] = weekStart.split("-");
  return `${day}/${month}`;
}

export function AdminAccountOverviewTab({
  account,
}: {
  account: AdminAccountDetail;
}) {
  const { usage } = account;
  const chart = usage.activity.map((p) => ({
    month: weekLabel(p.weekStart),
    count: p.surgeryRequests + p.appointments,
  }));

  return (
    <div className="space-y-4">
      <AccountHealthCard
        health={account.healthDetail}
        history={account.healthHistory}
      />
      <AdminStatGrid columns={6}>
        <AdminStatCard
          icon={ClipboardList}
          accent="teal"
          label="SCs no mês"
          value={account.surgeryRequestsThisMonth}
          footnote={`${account.surgeryRequestsTotal} no total`}
        />
        <AdminStatCard
          icon={CalendarCheck}
          accent="blue"
          label="Consultas no mês"
          value={account.appointmentsThisMonth}
          footnote={`${usage.appointments.completed} realizadas · ${usage.appointments.noShow} faltas`}
        />
        <AdminStatCard
          icon={Users}
          accent="violet"
          label="Pacientes"
          value={usage.patients.total}
          footnote={`${usage.patients.newInPeriod} novos no mês`}
        />
        <AdminStatCard
          icon={Stethoscope}
          accent="emerald"
          label="Médicos"
          value={account.doctors}
        />
        <AdminStatCard
          icon={UsersRound}
          accent="amber"
          label="Colaboradores"
          value={account.collaborators}
        />
        <AdminStatCard
          icon={Gauge}
          accent="slate"
          label="Cota de SCs"
          value={formatQuota({
            used: account.quota.used,
            limit: account.quota.limit,
          })}
        />
      </AdminStatGrid>
      <section className="rounded-2xl border border-gray-200">
        <div className="flex h-11 items-center justify-between border-b border-neutral-100 px-4">
          <h2 className="text-sm font-semibold">Atividade por semana</h2>
          <span className="text-xs text-gray-500">SCs + consultas</span>
        </div>
        <div className="p-4">
          <MonthlyBarChart data={chart} />
        </div>
      </section>
    </div>
  );
}
