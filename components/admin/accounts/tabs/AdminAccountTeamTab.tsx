import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  KeyRound,
  MessageCircle,
  ShieldCheck,
  ShieldOff,
  Users,
} from "lucide-react";
import Loading from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
} from "@/components/admin/AdminStatCard";
import { adminKeys } from "@/lib/query-keys";
import {
  formatRelative,
  formatSpDate,
  formatUsdCents,
} from "@/lib/admin-format";
import { ONBOARDING_STATUS_META } from "@/lib/admin-activation";
import { AccountSecurityLogs } from "@/components/admin/security/AccountSecurityLogs";
import { cn } from "@/lib/utils";
import {
  adminService,
  type AdminSecurityUser,
  type AdminTeamMember,
  type AdminTeamPeriodDays,
} from "@/services/admin.service";

const PERIODS: Array<{ days: AdminTeamPeriodDays; label: string }> = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

const ROLE_LABEL: Record<AdminTeamMember["role"], string> = {
  owner: "Dono",
  doctor: "Médico",
  collaborator: "Colaborador",
};

const STATUS_META: Record<
  AdminTeamMember["status"],
  { label: string; badge: string }
> = {
  active: { label: "Ativo", badge: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Convite pendente", badge: "bg-amber-50 text-amber-800" },
  inactive: { label: "Inativo", badge: "bg-gray-100 text-gray-600" },
};

const PERMISSION_LABEL: Record<string, string> = {
  agenda: "Agenda",
  atendimento: "Atendimento",
  solicitacoes: "Solicitações",
  financeiro: "Financeiro",
  administracao: "Administração",
};

function areasOf(member: AdminTeamMember): string {
  return (
    member.permissions.map((p) => PERMISSION_LABEL[p] ?? p).join(", ") || "—"
  );
}

function Badge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("ds-badge-sm whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

function RoleBadges({ member }: { member: AdminTeamMember }) {
  return (
    <span className="flex flex-wrap gap-1">
      <Badge className="bg-gray-100 text-gray-700">
        {ROLE_LABEL[member.role]}
      </Badge>
      {member.isDoctor && member.role !== "doctor" && (
        <Badge className="bg-teal-50 text-teal-700">Médico</Badge>
      )}
    </span>
  );
}

function MfaLabel({ enabled }: { enabled: boolean }) {
  const Icon = enabled ? ShieldCheck : ShieldOff;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        enabled ? "text-emerald-700" : "text-amber-700",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {enabled ? "Duas etapas ligada" : "Sem duas etapas"}
    </span>
  );
}

function SecuritySummary({ summary }: { summary?: AdminSecurityUser }) {
  if (!summary || summary.failures + summary.sessionsRevoked === 0) {
    return (
      <span className="text-xs text-gray-500">Sem alertas de segurança</span>
    );
  }
  return (
    <span className="flex flex-col text-xs">
      {summary.failures > 0 && (
        <span className="inline-flex items-center gap-1 text-amber-700">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          {summary.failures}{" "}
          {summary.failures === 1 ? "falha de login" : "falhas de login"}
        </span>
      )}
      {summary.sessionsRevoked > 0 && (
        <span className="text-red-700">
          {summary.sessionsRevoked}{" "}
          {summary.sessionsRevoked === 1
            ? "vez com sessões derrubadas"
            : "vezes com sessões derrubadas"}
        </span>
      )}
    </span>
  );
}

function needsMfa(member: AdminTeamMember): boolean {
  return member.status === "active" && !member.mfaEnabled;
}

function Consents({ member }: { member: AdminTeamMember }) {
  const terms =
    member.privacyPolicyAcceptedAt && member.termsOfUseAcceptedAt
      ? `Termos em ${formatSpDate(member.termsOfUseAcceptedAt)}`
      : "Termos pendentes";
  const ai = member.aiConsentAcceptedAt
    ? `IA em ${formatSpDate(member.aiConsentAcceptedAt)}`
    : "IA não autorizada";
  return (
    <span className="flex flex-col text-xs text-gray-600">
      <span>{terms}</span>
      <span>{ai}</span>
    </span>
  );
}

function OnboardingCell({ member }: { member: AdminTeamMember }) {
  const meta = ONBOARDING_STATUS_META[member.onboarding.status];
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge className={meta.badge}>{meta.label}</Badge>
      <span className="text-xs text-gray-500">
        {member.onboarding.completedSteps} de {member.onboarding.totalSteps}{" "}
        etapas
      </span>
    </span>
  );
}

function UsageList({ member }: { member: AdminTeamMember }) {
  const { usage } = member;
  const items = [
    { label: "SCs criadas", value: usage.surgeryRequests },
    { label: "Consultas registradas", value: usage.appointments },
    { label: "Fichas finalizadas", value: usage.recordsFinalized },
    { label: "Mensagens ao assistente", value: usage.assistantMessages },
    { label: "Custo de IA", value: formatUsdCents(usage.aiCostUsdCents) },
  ];
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-gray-500">{item.label}</dt>
          <dd className="text-right font-medium text-gray-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MemberCard({
  member,
  security,
}: {
  member: AdminTeamMember;
  security?: AdminSecurityUser;
}) {
  const status = STATUS_META[member.status];
  return (
    <li
      aria-label={member.name}
      className={cn(
        "space-y-3 rounded-2xl border p-3.5 shadow-sm",
        needsMfa(member)
          ? "border-amber-200 bg-amber-50/50"
          : "border-gray-200 bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{member.name}</p>
          <p className="truncate text-xs text-gray-500">{member.email}</p>
        </div>
        <Badge className={status.badge}>{status.label}</Badge>
      </div>
      <RoleBadges member={member} />
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-gray-500">Último acesso</p>
          <p className="font-medium text-gray-900">
            {formatRelative(member.lastSeenAt)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">WhatsApp</p>
          <p className="font-medium text-gray-900">
            {member.whatsappPhoneMasked ?? "Não vinculado"}
          </p>
        </div>
      </div>
      <MfaLabel enabled={member.mfaEnabled} />
      <SecuritySummary summary={security} />
      <Consents member={member} />
      <p className="text-xs text-gray-600">Áreas: {areasOf(member)}</p>
      <OnboardingCell member={member} />
      <div className="border-t border-gray-100 pt-2.5">
        <UsageList member={member} />
      </div>
    </li>
  );
}

export function AdminAccountTeamTab({ ownerId }: { ownerId: string }) {
  const [days, setDays] = useState<AdminTeamPeriodDays>(30);
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.accountTeam(ownerId, days),
    queryFn: () => adminService.getAccountTeam(ownerId, days),
    placeholderData: (previous) => previous,
  });
  const { data: security } = useQuery({
    queryKey: adminKeys.accountSecurity(ownerId, days),
    queryFn: () => adminService.getAccountSecurity(ownerId, days),
    placeholderData: (previous) => previous,
  });
  const securityByUser = new Map(
    (security?.users ?? []).map((u) => [u.userId, u] as const),
  );

  const periodPicker = (
    <div role="group" aria-label="Período do uso" className="ds-segmented">
      {PERIODS.map((p) => (
        <button
          key={p.days}
          type="button"
          aria-pressed={days === p.days}
          onClick={() => setDays(p.days)}
          className={cn(
            "ds-segmented-item whitespace-nowrap",
            days === p.days && "ds-segmented-item-active",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loading size="lg" />
      </div>
    );
  }
  if (isError || !data) {
    return <EmptyState title="Não foi possível carregar a equipe" />;
  }
  if (data.items.length === 0) {
    return <EmptyState title="Nenhum integrante na equipe" />;
  }

  const members = data.items;
  const total = members.length;
  const active = members.filter((m) => m.status === "active").length;
  const withMfa = members.filter((m) => m.mfaEnabled).length;
  const withAi = members.filter((m) => m.aiConsentAcceptedAt).length;
  const assistantMessages = members.reduce(
    (sum, m) => sum + m.usage.assistantMessages,
    0,
  );
  const withoutMfa = members.filter(needsMfa);

  return (
    <div className="space-y-6">
      <AdminStatGrid columns={4}>
        <AdminStatCard
          icon={Users}
          accent="blue"
          label="Integrantes"
          value={total}
          footnote={`${active} ${active === 1 ? "ativo" : "ativos"}`}
        />
        <AdminStatCard
          icon={ShieldCheck}
          accent={withMfa < total ? "amber" : "emerald"}
          label="Verificação em duas etapas"
          value={`${withMfa} de ${total}`}
          hint="Integrantes com o código do autenticador ligado"
        />
        <AdminStatCard
          icon={CheckCircle2}
          accent="violet"
          label="Consentimento de IA"
          value={`${withAi} de ${total}`}
          hint="Autorizaram o assistente do WhatsApp"
        />
        <AdminStatCard
          icon={MessageCircle}
          accent="teal"
          label="Mensagens ao assistente"
          value={assistantMessages}
          hint={`Nos últimos ${days} dias`}
        />
      </AdminStatGrid>

      {withoutMfa.length > 0 && (
        <div
          role="note"
          aria-label="Sem verificação em duas etapas"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <ShieldOff
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <p className="text-sm text-amber-900">
            {withoutMfa.length === 1
              ? "1 integrante ativo está sem verificação em duas etapas: "
              : `${withoutMfa.length} integrantes ativos estão sem verificação em duas etapas: `}
            {withoutMfa.map((m) => m.name).join(", ")}.
          </p>
        </div>
      )}

      <AdminSection
        title="Integrantes"
        description={`Somente leitura. Uso contado nos últimos ${days} dias.`}
        accent="blue"
        action={periodPicker}
      >
        <ul className="space-y-3 md:hidden">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              security={securityByUser.get(m.id)}
            />
          ))}
        </ul>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Integrante</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead>Consentimentos</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Áreas</TableHead>
                <TableHead>Onboarding</TableHead>
                <TableHead>
                  <span className="inline-flex items-center gap-1">
                    <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                    Uso no período
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const status = STATUS_META[m.status];
                return (
                  <TableRow
                    key={m.id}
                    className={cn(needsMfa(m) && "bg-amber-50/50")}
                  >
                    <TableCell className="align-top">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="mb-1 text-xs text-gray-500">{m.email}</p>
                      <RoleBadges member={m} />
                    </TableCell>
                    <TableCell className="align-top">
                      <span className="flex flex-col items-start gap-1">
                        <Badge className={status.badge}>{status.label}</Badge>
                        <span className="text-xs text-gray-500">
                          Último acesso {formatRelative(m.lastSeenAt)}
                        </span>
                        <MfaLabel enabled={m.mfaEnabled} />
                        <SecuritySummary summary={securityByUser.get(m.id)} />
                      </span>
                    </TableCell>
                    <TableCell className="align-top">
                      <Consents member={m} />
                    </TableCell>
                    <TableCell className="align-top text-xs text-gray-700">
                      {m.whatsappPhoneMasked ?? "Não vinculado"}
                    </TableCell>
                    <TableCell className="align-top text-xs text-gray-700">
                      {areasOf(m)}
                    </TableCell>
                    <TableCell className="align-top">
                      <OnboardingCell member={m} />
                    </TableCell>
                    <TableCell className="min-w-48 align-top">
                      <UsageList member={m} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </AdminSection>

      {security && (
        <AdminSection
          title="Registros de autenticação"
          description="Linhas de log do Grafana dos integrantes com eventos no período, com IP mascarado"
          accent="slate"
        >
          <AccountSecurityLogs
            ownerId={ownerId}
            days={days}
            lokiAvailable={security.lokiAvailable}
          />
        </AdminSection>
      )}
    </div>
  );
}
