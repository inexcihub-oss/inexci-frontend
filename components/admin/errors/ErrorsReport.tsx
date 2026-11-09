"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  MailX,
  TriangleAlert,
} from "lucide-react";
import {
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
} from "@/components/admin/AdminStatCard";
import { pluralize } from "@/lib/admin-format";
import { formatDateTime } from "@/lib/utils";
import type {
  AdminAccountErrors,
  AdminErrorFingerprint,
  AdminErrorPeriodDays,
  AdminErrorsOverview,
} from "@/services/admin.service";
import { ErrorDailyChart } from "./ErrorDailyChart";
import { ErrorFingerprintList } from "./ErrorFingerprintList";
import { ErrorOccurrencesDrawer } from "./ErrorOccurrencesDrawer";

export const ERRORS_PAGE_SIZE = 20;

export function ErrorsReport({
  data,
  days,
  page,
  onPageChange,
  ownerId,
  failedDeliveriesHref,
}: {
  data: AdminErrorsOverview | AdminAccountErrors;
  days: AdminErrorPeriodDays;
  page: number;
  onPageChange: (page: number) => void;
  ownerId?: string;
  failedDeliveriesHref: string;
}) {
  const [open, setOpen] = useState<AdminErrorFingerprint | null>(null);
  const { totals, fingerprints } = data;
  const accounts = "accounts" in data ? data.accounts : null;
  const pages = Math.max(Math.ceil(fingerprints.total / ERRORS_PAGE_SIZE), 1);

  return (
    <div className="space-y-6">
      {!data.lokiAvailable && (
        <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
          O detalhe de cada erro vem do Grafana, que não está configurado neste
          ambiente. As contagens abaixo continuam valendo.
        </p>
      )}

      <AdminStatGrid columns={4}>
        <AdminStatCard
          icon={TriangleAlert}
          accent="red"
          label="Erros"
          value={totals.total}
          tone={totals.total > 0 ? "danger" : "default"}
          hint="Falhas inesperadas da plataforma no período"
        />
        {ownerId ? (
          <AdminStatCard
            icon={Fingerprint}
            accent="amber"
            label="Tipos de erro"
            value={totals.fingerprints}
            hint="Erros diferentes, agrupados pela causa"
          />
        ) : (
          <AdminStatCard
            icon={Building2}
            accent="amber"
            label="Contas afetadas"
            value={totals.accounts}
            hint="Contas com pelo menos um erro"
            footnote={pluralize(
              totals.fingerprints,
              "tipo de erro",
              "tipos de erro",
            )}
          />
        )}
        <AdminStatCard
          icon={MailX}
          accent="blue"
          label="Envios com falha"
          value={totals.failedDeliveries}
          hint="E-mails e WhatsApp que não saíram"
          footnote={
            <Link
              href={failedDeliveriesHref}
              className="font-medium text-primary-700 hover:underline"
            >
              Ver envios
            </Link>
          }
        />
        <AdminStatCard
          icon={TriangleAlert}
          accent="slate"
          label="Último erro"
          value={
            fingerprints.items[0]
              ? formatDateTime(
                  fingerprints.items.reduce((max, f) =>
                    f.lastSeenAt > max.lastSeenAt ? f : max,
                  ).lastSeenAt,
                )
              : "—"
          }
          hint="Entre os erros desta página"
        />
      </AdminStatGrid>

      <Panel title="Erros por dia">
        <ErrorDailyChart
          daily={data.daily}
          fromDay={data.fromDay}
          toDay={data.toDay}
        />
      </Panel>

      <div
        className={
          accounts ? "grid grid-cols-1 gap-6 xl:grid-cols-3" : "space-y-6"
        }
      >
        <div className={accounts ? "min-w-0 xl:col-span-2" : undefined}>
          <AdminSection
            title="Erros mais frequentes"
            accent="red"
            description="Agrupados pela causa; o mesmo erro em contas diferentes conta como um tipo"
          >
            <ErrorFingerprintList
              items={fingerprints.items}
              showAccounts={!ownerId}
              onOpen={setOpen}
            />
            {pages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <span className="ds-caption">
                  Página {page} de {pages}
                </span>
                <button
                  type="button"
                  aria-label="Página anterior"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="ds-toolbar-btn ds-toolbar-icon"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Próxima página"
                  disabled={page >= pages}
                  onClick={() => onPageChange(page + 1)}
                  className="ds-toolbar-btn ds-toolbar-icon"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </AdminSection>
        </div>
        {accounts && (
          <AdminSection title="Contas mais afetadas" accent="amber">
            {accounts.length === 0 ? (
              <p className="ds-caption rounded-2xl border border-gray-200 bg-white p-4">
                Nenhuma conta com erro no período.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
                {accounts.map((a) => (
                  <li key={a.ownerId}>
                    <Link
                      href={`/admin/clientes/${a.ownerId}?tab=erros`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-900">
                          {a.ownerName ?? "Conta sem nome"}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {pluralize(a.fingerprints, "tipo", "tipos")} · última
                          em {formatDateTime(a.lastSeenAt)}
                        </span>
                      </span>
                      <span className="ds-badge-md shrink-0 bg-red-50 text-red-700">
                        {a.total}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>
        )}
      </div>

      <ErrorOccurrencesDrawer
        item={open}
        days={days}
        ownerId={ownerId}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <header className="border-b border-neutral-100 px-4 py-3">
        <h3 className="ds-section-title">{title}</h3>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
