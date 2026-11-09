import { useState } from "react";
import { Bot, DollarSign } from "lucide-react";
import { AdminStatCard, AdminStatGrid } from "@/components/admin/AdminStatCard";
import {
  AdminPeriodFilter,
  useAdminPeriod,
} from "@/components/admin/AdminPeriodFilter";
import { AiSourceSelect } from "@/components/admin/ai/AiSourceSelect";
import { AdminFilterField } from "@/components/admin/AdminFilters";
import { FinanceFilters } from "@/components/finance/FinanceFilters";
import { AiUsageTable } from "@/components/admin/ai/AiUsageTable";
import { useAiUsageRows } from "@/components/admin/ai/useAiUsageRows";
import { formatUsdCents } from "@/lib/admin-format";
import { recordsLabel, type AiSource } from "@/lib/admin-ai";

export function AdminAccountAiTab({ ownerId }: { ownerId: string }) {
  const periodState = useAdminPeriod("month", ["month", "7d", "30d", "90d"]);
  const [source, setSource] = useState<AiSource | "">("");
  const labels = recordsLabel(source);
  const users = useAiUsageRows("user", periodState.range, { source, ownerId });

  const rows = users.data ?? [];
  const totalCost = rows.reduce((acc, r) => acc + (r.costUsdCents ?? 0), 0);
  const totalTokens = rows.reduce((acc, r) => acc + r.totalTokens, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <AdminPeriodFilter state={periodState} />
        <FinanceFilters
          activeCount={source ? 1 : 0}
          onClear={() => setSource("")}
        >
          <AdminFilterField label="Origem">
            <AiSourceSelect value={source} onChange={setSource} />
          </AdminFilterField>
        </FinanceFilters>
      </div>
      <AdminStatGrid columns={2} className="max-w-xl">
        <AdminStatCard
          icon={DollarSign}
          accent="teal"
          label="Custo de IA no período"
          value={formatUsdCents(totalCost)}
        />
        <AdminStatCard
          icon={Bot}
          accent="violet"
          label="Tokens no período"
          value={totalTokens.toLocaleString("pt-BR")}
        />
      </AdminStatGrid>
      <AiUsageTable
        kind="user"
        rows={users.data}
        isLoading={users.isLoading}
        isError={users.isError}
        recordsPlural={labels.plural}
        recordsSingular={labels.singular}
      />
    </div>
  );
}
