"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  procedureService,
  CreateProcedurePayload,
} from "@/services/procedure.service";
import { getApiErrorMessage } from "@/lib/http-error";

interface CreateProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (procedure: any) => void;
}

export function CreateProcedureModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProcedureModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: CreateProcedurePayload = {
        name: name,
      };

      const newProcedure = await procedureService.create(payload);
      onSuccess(newProcedure);
      onClose();
      setName("");
    } catch (error: unknown) {
      alert(
        getApiErrorMessage(
          error,
          "Erro ao criar procedimento. Tente novamente.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-gray-200">
          <h2 className="ds-modal-title">Novo procedimento</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 pt-5 pb-6">
            <label className="ds-label">Nome do procedimento</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ds-input"
              placeholder="Ex. Artroscopia de Joelho"
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-3 md:px-6 md:py-4 border-t border-gray-200 flex justify-end">
            <button type="submit" disabled={loading} className="ds-btn-primary">
              {loading ? "Adicionando..." : "Adicionar procedimento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
