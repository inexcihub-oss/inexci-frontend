"use client";

import { AdminReasonModal } from "./AdminReasonModal";
import { adminService } from "@/services/admin.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  adminId: string;
  name: string;
  email: string;
}

export function ResetAdminAccessModal({
  isOpen,
  onClose,
  adminId,
  name,
  email,
}: Props) {
  return (
    <AdminReasonModal
      isOpen={isOpen}
      onClose={onClose}
      title="Redefinir acesso"
      confirmLabel="Redefinir acesso"
      loadingLabel="Redefinindo..."
      successMessage="Acesso redefinido. Um novo convite foi enviado."
      reasonId="reset-admin-reason"
      action={(reason) =>
        adminService.resetTeamMemberAccess(adminId, { reason })
      }
    >
      <p className="text-sm text-gray-700">
        Redefinir o acesso de <strong>{name}</strong>?
      </p>
      <ul className="list-disc space-y-1 rounded-xl bg-amber-50 py-2 pl-7 pr-3 text-sm text-amber-800">
        <li>A senha e a verificação em duas etapas são apagadas.</li>
        <li>As sessões abertas são encerradas na hora.</li>
        <li>
          Um novo convite é enviado para <strong>{email}</strong>, para criar
          outra senha e cadastrar o autenticador de novo.
        </li>
      </ul>
    </AdminReasonModal>
  );
}
