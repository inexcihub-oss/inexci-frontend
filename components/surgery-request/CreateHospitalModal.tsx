"use client";

import { useState } from "react";
import {
  hospitalService,
  CreateHospitalPayload,
  Hospital,
} from "@/services/hospital.service";

interface CreateHospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hospital: Hospital) => void;
}

export function CreateHospitalModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateHospitalModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Por favor, preencha o nome do hospital.");
      return;
    }

    setLoading(true);

    try {
      const payload: CreateHospitalPayload = {
        name: name.trim(),
      };

      const newHospital = await hospitalService.create(payload);
      onSuccess(newHospital);
      setName("");
      onClose();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        "Erro ao criar hospital. Tente novamente.";
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
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Novo Hospital
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Hospital *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite o nome do hospital"
                className="w-full px-4 py-2.5 border border-[#DCDFE3] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
              >
                {loading ? "Criando..." : "Criar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
