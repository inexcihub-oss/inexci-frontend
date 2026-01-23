"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Search, Plus } from "lucide-react";
import { hospitalService, Hospital } from "@/services/hospital.service";

interface HospitalSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHospital: (hospital: Hospital) => void;
  onCreateNew: () => void;
}

export function HospitalSelectionModal({
  isOpen,
  onClose,
  onSelectHospital,
  onCreateNew,
}: HospitalSelectionModalProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHospitals();
    }
  }, [isOpen]);

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const data = await hospitalService.getAll();
      setHospitals(data);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const filteredHospitals = hospitals.filter((hospital) =>
    hospital.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Selecionar Hospital"
      size="lg"
    >
      <div className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar hospital..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#DCDFE3] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Hospital
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : filteredHospitals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum hospital encontrado
            </div>
          ) : (
            filteredHospitals.map((hospital) => (
              <button
                key={hospital.id}
                onClick={() => {
                  onSelectHospital(hospital);
                  onClose();
                }}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-all"
              >
                <div className="font-medium text-gray-900">{hospital.name}</div>
                {hospital.phone && (
                  <div className="text-sm text-gray-500 mt-1">
                    Tel: {hospital.phone}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
