import { useQuery } from "@tanstack/react-query";
import Loading from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { adminKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin.service";
import { AUDIT_ACTION_LABEL } from "@/lib/admin-audit";
import { formatDateTime } from "@/lib/utils";

const STATUS_LABEL = {
  pending: "Pendente",
  succeeded: "Concluída",
  failed: "Falhou",
} as const;

const HISTORY_DESCRIPTION =
  "Aqui fica registrado o que a equipe Inexci fez nesta conta pelo painel, como estender o trial ou liberar acesso interno, com quem fez, quando e o motivo.";

export function AdminAccountHistoryTab({ ownerId }: { ownerId: string }) {
  const params = { targetOwnerId: ownerId, limit: 50 };
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.auditLogs(params),
    queryFn: () => adminService.listAuditLogs(params),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loading size="lg" />
      </div>
    );
  }
  if (isError || !data) {
    return <EmptyState title="Não foi possível carregar o histórico" />;
  }
  if (data.items.length === 0) {
    return (
      <EmptyState
        title="Nenhuma ação da equipe nesta conta"
        description={HISTORY_DESCRIPTION}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="ds-caption">{HISTORY_DESCRIPTION}</p>
      <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
        {data.items.map((item) => (
          <li key={item.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900">
                {AUDIT_ACTION_LABEL[item.action] ?? item.action}
              </p>
              <span className="text-xs text-gray-500">
                {formatDateTime(item.createdAt)}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              por {item.actorName ?? item.actorEmail ?? "—"} ·{" "}
              {STATUS_LABEL[item.status]}
            </p>
            {item.reason && (
              <p className="mt-1 text-sm text-gray-700">{item.reason}</p>
            )}
            {item.error && (
              <p className="mt-1 text-sm text-red-600">{item.error}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
