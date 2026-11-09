"use client";

import { AdminReasonModal } from "@/components/admin/team/AdminReasonModal";
import { adminService, type AdminStripeEvent } from "@/services/admin.service";

export function ReprocessStripeEventModal({
  event,
  onClose,
}: {
  event: AdminStripeEvent;
  onClose: () => void;
}) {
  return (
    <AdminReasonModal
      isOpen
      onClose={onClose}
      title="Reprocessar evento"
      confirmLabel="Reprocessar"
      loadingLabel="Reprocessando..."
      successMessage="Evento processado."
      reasonId="stripe-event-reason"
      action={(reason) => adminService.reprocessStripeEvent(event.id, reason)}
    >
      <p className="text-sm text-gray-700">
        <strong>{event.label}</strong>
        {event.ownerName && <> · {event.ownerName}</>}
      </p>
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
        A plataforma aplica de novo este evento, do mesmo jeito que faria ao
        recebê-lo da Stripe. A assinatura da conta pode mudar de situação.
      </p>
    </AdminReasonModal>
  );
}
