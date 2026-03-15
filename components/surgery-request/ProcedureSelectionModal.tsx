"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Search, Plus } from "lucide-react";
import { procedureService, Procedure } from "@/services/procedure.service";

interface ProcedureSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProcedure: (procedure: Procedure) => void;
  onCreateNew: () => void;
}

export function ProcedureSelectionModal({
  isOpen,
  onClose,
  onSelectProcedure,
  onCreateNew,
}: ProcedureSelectionModalProps) {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProcedures();
    }
  }, [isOpen]);

  const loadProcedures = async () => {
    setLoading(true);
    try {
      const data = await procedureService.getAll();
      setProcedures(data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const filteredProcedures = procedures.filter((procedure) =>
    procedure.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Selecionar Procedimento"
      size="lg"
    >
      <div className="p-4 md:p-6">
        <div className="flex gap-3 md:gap-4 mb-4 md:mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar procedimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ds-input pl-10"
            />
          </div>

          {/* New Button */}
          <button
            onClick={onCreateNew}
            className="ds-btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Novo Procedimento
          </button>
        </div>

        {/* Procedures List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : filteredProcedures.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum procedimento encontrado
            </div>
          ) : (
            filteredProcedures.map((procedure) => (
              <button
                key={procedure.id}
                onClick={() => {
                  onSelectProcedure(procedure);
                  onClose();
                }}
                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-blue-500 transition-all"
              >
                <div className="font-medium text-gray-900">
                  {procedure.name}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
