"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ProcedureSelectionContent } from "@/components/surgery-request/wizard-steps/SelectionContents";
import { CreateProcedureModal } from "@/components/surgery-request/CreateProcedureModal";
import { Procedure } from "@/services/procedure.service";
import { hasAnyArea } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";

interface ProcedureQuickPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (procedure: Procedure) => void;
  selectedProcedureId?: string | null;
}

/**
 * Reaproveita, fora do wizard de criação de SC, a mesma combinação "buscar
 * procedimento no catálogo + botão Novo que cria um" que já existe no
 * primeiro passo do wizard — `ProcedureSelectionContent` (lista/busca) e
 * `CreateProcedureModal` (form de criar) — numa casca fina, sem arrastar
 * paciente/hospital/convênio/médico junto.
 */
export function ProcedureQuickPickerModal({
  isOpen,
  onClose,
  onSelect,
  selectedProcedureId,
}: ProcedureQuickPickerModalProps) {
  const [view, setView] = useState<"select" | "create">("select");
  const { permissions } = useAuth();
  const podeCriarCadastroTransversal = hasAnyArea(permissions);
  // Registrado pelo `ProcedureSelectionContent` para manter o cache do
  // react-query em dia quando um procedimento é criado por aqui.
  const addToListRef = useRef<((item: Procedure) => void) | null>(null);

  const handleClose = () => {
    setView("select");
    onClose();
  };

  const handleSelect = (procedure: Procedure) => {
    onSelect(procedure);
    handleClose();
  };

  const handleCreated = (procedure: Procedure) => {
    addToListRef.current?.(procedure);
    handleSelect(procedure);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Procedimento" size="sm">
        <ProcedureSelectionContent
          onSelect={handleSelect}
          onCreateNew={() => setView("create")}
          onNewItemCreated={(registerFn) => {
            addToListRef.current = registerFn;
          }}
          selectedItemId={selectedProcedureId}
          isActive={isOpen && view === "select"}
          canCreate={podeCriarCadastroTransversal}
          canDelete={false}
        />
      </Modal>

      <CreateProcedureModal
        isOpen={isOpen && view === "create"}
        onClose={() => setView("select")}
        onSuccess={handleCreated}
      />
    </>
  );
}
