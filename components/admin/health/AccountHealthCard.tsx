import { CheckCircle2, HeartPulse } from "lucide-react";
import { AdminIconChip } from "@/components/admin/AdminStatCard";
import { AreaLineChart } from "@/components/dashboard/charts/AreaLineChart";
import { HEALTH_META, HEALTH_NO_SCORE_HINT } from "@/lib/admin-health";
import type { AdminAccountDetail } from "@/services/admin.service";
import { cn, formatDateTime } from "@/lib/utils";

function dayLabel(day: string): string {
  const [, month, d] = day.split("-");
  return `${d}/${month}`;
}

export function AccountHealthCard({
  health,
  history,
}: {
  health: AdminAccountDetail["healthDetail"];
  history: AdminAccountDetail["healthHistory"];
}) {
  const meta = health ? HEALTH_META[health.band] : null;

  return (
    <section
      aria-label="Saúde da conta"
      className="rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <header className="flex flex-wrap items-center gap-2.5 border-b border-neutral-100 px-4 py-3">
        <AdminIconChip
          icon={HeartPulse}
          accent={meta?.accent ?? "slate"}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <h2 className="ds-section-title">Saúde da conta</h2>
          <p className="ds-caption">
            {health
              ? `Calculada em ${formatDateTime(health.computedAt)}`
              : HEALTH_NO_SCORE_HINT}
          </p>
        </div>
        {health && meta && (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-gray-900">
              {health.score}
            </span>
            <span className={cn("ds-badge-md", meta.badge)}>{meta.label}</span>
          </div>
        )}
      </header>

      {health && (
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              O que pesou na nota
            </h3>
            {health.factors.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Nenhum ponto de atenção
              </p>
            ) : (
              <ul className="space-y-2">
                {health.factors.map((f) => (
                  <li
                    key={f.key}
                    className="flex items-start justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-800"
                  >
                    <span className="min-w-0">{f.message}</span>
                    <span className="shrink-0 font-semibold text-red-700">
                      −{f.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Últimos 30 dias
            </h3>
            <table className="sr-only">
              <caption>Nota de saúde por dia</caption>
              <thead>
                <tr>
                  <th scope="col">Dia</th>
                  <th scope="col">Nota</th>
                  <th scope="col">Faixa</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.day}>
                    <th scope="row">{dayLabel(p.day)}</th>
                    <td>{p.score}</td>
                    <td>{HEALTH_META[p.band].label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div aria-hidden="true">
              <AreaLineChart
                data={history.map((p) => ({ date: p.day, value: p.score }))}
                height={120}
                formatLabel={dayLabel}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
