"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import {
  AUDIT_ACTION_LABEL,
  AUDIT_STATUS_LABEL,
  auditEntries,
  formatDateTimeSP,
} from "@/lib/admin-audit";
import type { PlatformAuditLogItem } from "@/services/admin.service";

function Block({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown> | null;
}) {
  const entries = auditEntries(data);
  return (
    <section aria-label={title}>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">Sem dados</p>
      ) : (
        <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-3 px-3 py-2 text-sm">
              <dt className="w-40 shrink-0 text-gray-500">{key}</dt>
              <dd className="min-w-0 break-words text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

interface Props {
  item: PlatformAuditLogItem | null;
  onClose: () => void;
}

export function AuditDetailDrawer({ item, onClose }: Props) {
  return (
    <Modal
      isOpen={!!item}
      onClose={onClose}
      variant="drawer"
      title={item ? AUDIT_ACTION_LABEL[item.action] : ""}
    >
      {item && (
        <div className="space-y-5 p-4 md:p-6">
          <div className="space-y-1 text-sm text-gray-700">
            <p>
              Por {item.actorName ?? item.actorEmail ?? "—"} em{" "}
              {formatDateTimeSP(item.createdAt)}
            </p>
            <p>Situação: {AUDIT_STATUS_LABEL[item.status]}</p>
            {item.targetOwnerId && (
              <p>
                <Link
                  href={`/admin/clientes/${item.targetOwnerId}`}
                  className="text-teal-700 underline"
                >
                  Abrir conta
                </Link>
              </p>
            )}
            {item.reason && <p>Motivo: {item.reason}</p>}
            {item.gatewayRef && <p>Stripe: {item.gatewayRef}</p>}
            {item.error && <p className="text-red-600">{item.error}</p>}
          </div>
          <Block title="Antes" data={item.before} />
          <Block title="Depois" data={item.after} />
        </div>
      )}
    </Modal>
  );
}
