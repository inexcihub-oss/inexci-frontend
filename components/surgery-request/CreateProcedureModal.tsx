"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  procedureService,
  CreateProcedurePayload,
} from "@/services/procedure.service";

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
        description: "",
      };

      const newProcedure = await procedureService.create(payload);
      onSuccess(newProcedure);
      onClose();
      setName("");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        "Erro ao criar procedimento. Tente novamente.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">
            Novo procedimento
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-[#DCDFE3] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder:text-gray-400"
              placeholder="Nome do procedimento"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? "Adicionando..." : "Adicionar procedimento"}
          </button>
        </form>
      </div>
    </div>
  );
}
