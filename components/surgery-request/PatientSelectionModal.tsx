"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Search, Plus } from "lucide-react";
import { patientService, Patient } from "@/services/patient.service";

interface PatientSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patient: Patient) => void;
  onCreateNew: () => void;
}

export function PatientSelectionModal({
  isOpen,
  onClose,
  onSelectPatient,
  onCreateNew,
}: PatientSelectionModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPatients();
    }
  }, [isOpen]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await patientService.getAll();
      setPatients(data);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf?.includes(searchTerm)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Selecionar Paciente"
      size="lg"
    >
      <div className="p-6">
        <div className="flex gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar paciente por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* New Button */}
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Paciente
          </button>
        </div>

        {/* Patients List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum paciente encontrado
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => {
                  onSelectPatient(patient);
                  onClose();
                }}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-all"
              >
                <div className="font-medium text-gray-900">{patient.name}</div>
                <div className="text-sm text-gray-500 mt-1 flex gap-4">
                  {patient.cpf && <span>CPF: {patient.cpf}</span>}
                  {patient.phone && <span>Tel: {patient.phone}</span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
