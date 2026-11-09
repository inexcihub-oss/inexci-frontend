"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, Lock, ShieldAlert, ShieldOff } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
} from "@/components/admin/AdminStatCard";
import { ErrorDailyChart } from "@/components/admin/errors/ErrorDailyChart";
import { pluralize } from "@/lib/admin-format";
import {
  FAILURE_EVENT_TYPES,
  SECURITY_PERIODS,
  parseSecurityDays,
  sumSecurityEvents,
} from "@/lib/admin-security";
import { adminKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  adminService,
  type AdminSecurityOverview,
} from "@/services/admin.service";
import { SecurityAccountList } from "./SecurityAccountList";
import { SecurityEventBreakdown } from "./SecurityEventBreakdown";

function SecurityReport({ data }: { data: AdminSecurityOverview }) {
  const { totals, spike, mfa } = data;
  const failures = sumSecurityEvents(totals, FAILURE_EVENT_TYPES);
  const failureDaily = data.daily.filter((d) =>
    FAILURE_EVENT_TYPES.includes(d.eventType),
  );

  return (
    <div className="space-y-6">
      {spike.platformSpike && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {spike.platformTotal24h} falhas de login nas últimas 24 h, acima do
          limite de {spike.platformThreshold}. Pode ser uma tentativa de ataque.
        </p>
      )}

      <AdminStatGrid columns={4}>
        <AdminStatCard
          icon={KeyRound}
          accent="amber"
          label="Falhas de login"
          value={failures}
          tone={failures > 0 ? "warning" : "default"}
          hint="Senha errada, login bloqueado e código de duas etapas errado"
          footnote={`${spike.platformTotal24h} nas últimas 24 h`}
        />
        <AdminStatCard
          icon={Lock}
          accent="red"
          label="Logins bloqueados"
          value={totals.login_locked}
          hint="Tentativas durante o bloqueio por excesso de erros"
          footnote={pluralize(
            data.unattributedLocks,
            "em e-mail que não é de ninguém",
            "em e-mails que não são de ninguém",
          )}
        />
        <AdminStatCard
          icon={ShieldAlert}
          accent="red"
          label="Reuso de sessão"
          value={totals.refresh_reuse}
          tone={totals.refresh_reuse > 0 ? "danger" : "default"}
          hint="Token de sessão usado duas vezes; todas as sessões do usuário caíram"
        />
        <AdminStatCard
          icon={ShieldOff}
          accent="amber"
          label="Sem duas etapas"
          value={`${mfa.withoutMfa} de ${mfa.activeUsers}`}
          hint="Usuários ativos das clínicas sem o código do autenticador"
        />
      </AdminStatGrid>

      <AdminSection title="Falhas de login por dia" accent="amber">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <ErrorDailyChart
            daily={failureDaily}
            fromDay={data.fromDay}
            toDay={data.toDay}
            label="Falhas"
          />
        </div>
      </AdminSection>

      <AdminSection
        title="Eventos por tipo"
        description="Contagem no período, sem e-mail digitado nem IP"
        accent="blue"
      >
        <SecurityEventBreakdown totals={totals} />
      </AdminSection>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AdminSection
          title="Contas com mais falhas de login"
          description={`Alerta a partir de ${spike.accountThreshold} falhas em 24 h por conta`}
          accent="amber"
        >
          <SecurityAccountList
            items={data.failureAccounts}
            empty="Nenhuma falha de login no período."
            unit={["falha", "falhas"]}
          />
        </AdminSection>
        <AdminSection
          title="Contas com reuso de sessão"
          description="Sinal de token roubado ou de app aberto em dois lugares"
          accent="red"
        >
          <SecurityAccountList
            items={data.reuseAccounts}
            empty="Nenhum reuso de sessão no período."
            unit={["reuso", "reusos"]}
          />
        </AdminSection>
      </div>
    </div>
  );
}

export function AdminSecurity() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const days = parseSecurityDays(searchParams.get("periodo"));

  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.security(days),
    queryFn: () => adminService.getSecurity(days),
    placeholderData: (previous) => previous,
  });

  const setDays = (value: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("periodo", String(value));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-neutral-900">Segurança</h1>
            <p className="text-xs text-neutral-500">
              Falhas de login, sessões derrubadas e verificação em duas etapas
            </p>
          </div>
          <div className="-mx-3 w-[calc(100%+1.5rem)] overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:px-0">
            <div role="group" aria-label="Período" className="ds-segmented">
              {SECURITY_PERIODS.map((p) => (
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
          </div>
        </header>
        <div className="flex-1 overflow-auto p-3 lg:p-6">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : isError || !data ? (
            <EmptyState
              title="Não foi possível carregar a segurança"
              description="Tente novamente em instantes."
            />
          ) : (
            <SecurityReport data={data} />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
