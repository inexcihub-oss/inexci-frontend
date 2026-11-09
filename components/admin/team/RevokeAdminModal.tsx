"use client";

import { AdminReasonModal } from "./AdminReasonModal";
import { adminService } from "@/services/admin.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  adminId: string;
  name: string;
}

export function RevokeAdminModal({ isOpen, onClose, adminId, name }: Props) {
  return (
    <AdminReasonModal
      isOpen={isOpen}
      onClose={onClose}
      title="Revogar acesso"
      confirmLabel="Revogar acesso"
      loadingLabel="Revogando..."
      successMessage="Acesso revogado."
      reasonId="revoke-admin-reason"
      action={(reason) => adminService.revokeTeamMember(adminId, { reason })}
    >
      <p className="text-sm text-gray-700">
        Revogar o acesso de <strong>{name}</strong>?
      </p>
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
        A pessoa perde o acesso ao painel na hora e as sessões abertas são
        encerradas.
      </p>
    </AdminReasonModal>
  );
}
