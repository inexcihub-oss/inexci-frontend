"use client";

import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

interface NoActiveDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToCollaborators: () => void;
  loading?: boolean;
}

export function NoActiveDoctorModal({
  isOpen,
  onClose,
  onGoToCollaborators,
  loading = false,
}: NoActiveDoctorModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adicione um médico ativo para continuar"
      size="sm"
    >
      <div className="p-5 md:p-6 space-y-5">
        <p className="text-sm text-gray-600 leading-relaxed">
          Para criar uma solicitação cirúrgica, sua conta precisa ter pelo menos
          um médico com status ativo.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Agora não
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onGoToCollaborators}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Ir para colaboradores
          </Button>
        </div>
      </div>
    </Modal>
  );
}
