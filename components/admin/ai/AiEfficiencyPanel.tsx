import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Bot,
  DollarSign,
  MessageSquare,
  Timer,
  Wrench,
  Zap,
} from "lucide-react";
import { AdminStatCard, AdminStatGrid } from "@/components/admin/AdminStatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/AdminDataTable";
import { formatUsdCents } from "@/lib/admin-format";
import { adminKeys } from "@/lib/query-keys";
import {
  adminService,
  type AdminAiEfficiencyReport,
} from "@/services/admin.service";
import type { AdminPeriodRange } from "@/components/admin/AdminPeriodFilter";

const num = (n: number) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const ms = (n: number) => `${Math.round(n).toLocaleString("pt-BR")} ms`;

type DraftRow = AdminAiEfficiencyReport["byDraftType"][number];

const DRAFT_COLUMNS: AdminColumn<DraftRow>[] = [
  {
    key: "tipo",
    header: "Tipo",
    mobile: "title",
    className: "font-medium",
    cell: (d) => d.draftType,
  },
  {
    key: "turnos",
    header: "Turnos",
    headClassName: "text-right",
    className: "text-right",
    cell: (d) => d.turns,
  },
  {
    key: "tokens",
    header: "Tokens médios",
    headClassName: "text-right",
    className: "text-right",
    cell: (d) => num(d.avgTotalTokens),
  },
  {
    key: "cache",
    header: "Acerto de cache",
    headClassName: "text-right",
    className: "text-right",
    cell: (d) => `${num(d.cacheHitRate)}%`,
  },
];

export function AiEfficiencyPanel({
  range,
}: {
  range: AdminPeriodRange | null;
}) {
  const params = range ?? {};
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.aiEfficiency(params),
    queryFn: () => adminService.getAiEfficiency(params),
    enabled: range !== null,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loading size="lg" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <EmptyState
        title="Não foi possível carregar a eficiência"
        description="Tente novamente em instantes."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Considera apenas as conversas do WhatsApp. p50 é o valor típico (metade
        dos turnos fica abaixo dele) e p95 é o dos turnos mais pesados (só 5%
        passam dele).
      </p>
      <AdminStatGrid columns={4}>
        <AdminStatCard
          icon={MessageSquare}
          accent="teal"
          label="Turnos"
          value={data.totalTurns.toLocaleString("pt-BR")}
          hint="Cada mensagem respondida pelo assistente"
          footnote={`${data.totalConversations} conversas · ${data.totalUsers} usuários`}
        />
        <AdminStatCard
          icon={Bot}
          accent="violet"
          label="Tokens por turno"
          value={num(data.avgTotalTokens)}
          footnote={`p50 ${num(data.p50TotalTokens)} · p95 ${num(data.p95TotalTokens)}`}
        />
        <AdminStatCard
          icon={Timer}
          accent="amber"
          label="Latência média"
          value={ms(data.avgLatencyMs)}
          footnote={`p50 ${ms(data.p50LatencyMs)} · p95 ${ms(data.p95LatencyMs)}`}
        />
        <AdminStatCard
          icon={Wrench}
          accent="blue"
          label="Chamadas por turno"
          value={num(data.avgCallsPerTurn)}
        />
        <AdminStatCard
          icon={Zap}
          accent="emerald"
          label="Acerto de cache"
          value={`${num(data.cacheHitRate)}%`}
          hint="Parte dos tokens de entrada reaproveitada do cache da OpenAI, que custa menos"
        />
        <AdminStatCard
          icon={BookOpen}
          accent="emerald"
          label="Acerto do RAG"
          value={`${num(data.ragHitRate)}%`}
          hint="Turnos em que a base de conhecimento trouxe resultado"
        />
        <AdminStatCard
          icon={DollarSign}
          accent="red"
          label="Custo total"
          value={formatUsdCents(data.totalCostCents ?? 0)}
        />
        <AdminStatCard
          icon={DollarSign}
          accent="red"
          label="Custo médio por turno"
          value={formatUsdCents(Math.round(data.avgCostCents ?? 0))}
        />
      </AdminStatGrid>
      {data.byDraftType.length > 0 && (
        <section
          aria-label="Por tipo de rascunho"
          className="overflow-hidden rounded-2xl border border-gray-200"
        >
          <div className="flex h-11 items-center border-b border-neutral-100 px-4">
            <h2 className="text-sm font-semibold">Por tipo de rascunho</h2>
          </div>
          <AdminDataTable
            rows={data.byDraftType}
            columns={DRAFT_COLUMNS}
            rowKey={(d) => d.draftType}
          />
        </section>
      )}
    </div>
  );
}
