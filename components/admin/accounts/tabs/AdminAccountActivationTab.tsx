import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CircleCheck,
  CircleDashed,
  ClipboardList,
  Compass,
  MessageCircle,
  Rocket,
  Send,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Loading from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AdminIconChip,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
} from "@/components/admin/AdminStatCard";
import { adminKeys } from "@/lib/query-keys";
import { formatSpDate } from "@/lib/admin-format";
import {
  formatDays,
  formatDaysAfterSignup,
  MILESTONE_LABEL,
  ONBOARDING_STATUS_META,
  ONBOARDING_STEP_LABEL,
  ONBOARDING_TRACK_LABEL,
  type ActivationMilestoneKey,
} from "@/lib/admin-activation";
import { cn } from "@/lib/utils";
import {
  adminService,
  type AdminAccountActivation,
} from "@/services/admin.service";

const MILESTONE_ICON: Record<ActivationMilestoneKey, LucideIcon> = {
  first_patient: UserPlus,
  first_appointment: CalendarCheck,
  first_surgery_request: ClipboardList,
  first_sent_to_insurer: Send,
  first_whatsapp: MessageCircle,
};

function Milestones({ data }: { data: AdminAccountActivation }) {
  return (
    <ol className="space-y-2">
      {data.milestones.map((m) => {
        const done = m.at !== null;
        return (
          <li
            key={m.key}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-3 sm:p-3.5",
              done
                ? "border-emerald-100 bg-emerald-50/60"
                : "border-gray-200 bg-white",
            )}
          >
            <AdminIconChip
              icon={MILESTONE_ICON[m.key]}
              accent={done ? "emerald" : "slate"}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {MILESTONE_LABEL[m.key]}
              </p>
              <p className="text-xs text-gray-500">
                {formatDaysAfterSignup(m.daysFromSignup)}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-gray-700">
              {done ? formatSpDate(m.at) : "—"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Onboarding({ data }: { data: AdminAccountActivation }) {
  const { onboarding } = data;
  const members = onboarding.members;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section
        aria-label="Primeiros passos"
        className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm"
      >
        <header className="border-b border-neutral-100 px-4 py-3">
          <h3 className="ds-section-title">Primeiros passos</h3>
          <p className="ds-caption mt-0.5">
            Quantos integrantes concluíram cada etapa do checklist
          </p>
        </header>
        <ul className="divide-y divide-gray-100">
          {onboarding.steps.map((step) => {
            const done = step.completedBy > 0;
            const Icon = done ? CircleCheck : CircleDashed;
            return (
              <li
                key={step.key}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm"
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 shrink-0",
                    done ? "text-emerald-600" : "text-gray-300",
                  )}
                />
                <span className="min-w-0 flex-1 text-gray-800">
                  {ONBOARDING_STEP_LABEL[step.key]}
                </span>
                <span className="shrink-0 text-xs text-gray-500">
                  {step.completedBy} de {members}
                  {step.firstCompletedAt &&
                    ` · ${formatSpDate(step.firstCompletedAt)}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <section
        aria-label="Tours vistos"
        className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm"
      >
        <header className="border-b border-neutral-100 px-4 py-3">
          <h3 className="ds-section-title">Tours vistos</h3>
          <p className="ds-caption mt-0.5">
            Quantos integrantes abriram cada trilha guiada
          </p>
        </header>
        <ul className="divide-y divide-gray-100">
          {onboarding.tracks.map((track) => (
            <li
              key={track.key}
              className="flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1 text-gray-800">
                {ONBOARDING_TRACK_LABEL[track.key]}
              </span>
              <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-gray-100">
                <span
                  aria-hidden="true"
                  className="block h-full rounded-full bg-violet-500"
                  style={{
                    width: `${members ? (track.seenBy / members) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className="w-12 shrink-0 text-right text-xs text-gray-500">
                {track.seenBy} de {members}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function AdminAccountActivationTab({ ownerId }: { ownerId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.accountActivation(ownerId),
    queryFn: () => adminService.getAccountActivation(ownerId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loading size="lg" />
      </div>
    );
  }
  if (isError || !data) {
    return <EmptyState title="Não foi possível carregar a ativação" />;
  }

  const reached = data.milestones.filter((m) => m.at !== null).length;
  const statusCount = new Map(
    data.onboarding.byStatus.map((s) => [s.status, s.count]),
  );
  const completed = statusCount.get("completed") ?? 0;
  const inProgress = statusCount.get("in_progress") ?? 0;

  return (
    <div className="space-y-6">
      <AdminStatGrid columns={3}>
        <AdminStatCard
          icon={Rocket}
          accent={data.activatedAt ? "emerald" : "amber"}
          label="Ativação"
          value={
            data.activatedAt ? formatDays(data.daysToActivate) : "Ainda não"
          }
          hint="Do cadastro até a primeira consulta ou solicitação"
          footnote={`Cadastro em ${formatSpDate(data.signupAt)}`}
        />
        <AdminStatCard
          icon={CircleCheck}
          accent="teal"
          label="Marcos alcançados"
          value={`${reached} de ${data.milestones.length}`}
          hint="Primeiras ações importantes da clínica"
        />
        <AdminStatCard
          icon={Compass}
          accent="violet"
          label="Onboarding concluído"
          value={`${completed} de ${data.onboarding.members}`}
          hint="Integrantes que terminaram os primeiros passos"
          footnote={`${inProgress} em andamento`}
        />
      </AdminStatGrid>

      <AdminSection
        title="Marcos de ativação"
        description="Quando a clínica fez cada coisa pela primeira vez"
        accent="emerald"
      >
        <Milestones data={data} />
      </AdminSection>

      <AdminSection
        title="Onboarding da equipe"
        description="Andamento do tour guiado de todos os integrantes"
        accent="violet"
      >
        <div className="flex flex-wrap gap-2">
          {data.onboarding.byStatus.map((s) => (
            <span
              key={s.status}
              className={cn(
                "ds-badge-md",
                ONBOARDING_STATUS_META[s.status].badge,
              )}
            >
              {ONBOARDING_STATUS_META[s.status].label}: {s.count}
            </span>
          ))}
        </div>
        <Onboarding data={data} />
      </AdminSection>
    </div>
  );
}
