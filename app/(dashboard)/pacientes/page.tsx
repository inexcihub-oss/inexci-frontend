"use client";

import { useState, useEffect } from "react";
import { patientService, Patient } from "@/services/patient.service";
import { Checkbox, SearchIcon, DotsMenuIcon } from "@/components/ui";

export default function PacientesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

  const handleSelectAll = () => {
    if (selectedItems.size === patients.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(patients.map((item) => item.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const getFilteredData = () => {
    if (!searchTerm) return patients;

    return patients.filter((item) => {
      const name = item.name.toLowerCase();
      const email = item.email?.toLowerCase() || "";
      const cpf = item.cpf || "";
      const search = searchTerm.toLowerCase();
      return (
        name.includes(search) || email.includes(search) || cpf.includes(search)
      );
    });
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRandomColor = (id: string) => {
    const colors = [
      "bg-blue-200",
      "bg-green-200",
      "bg-yellow-200",
      "bg-purple-200",
      "bg-pink-200",
      "bg-indigo-200",
    ];
    const idString = String(id);
    const index = idString.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("pt-BR");
    } catch {
      return "-";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex-none flex items-center gap-2 px-8 py-3 border-b border-gray-200">
        <h1 className="text-3xl font-semibold text-black font-urbanist">
          Pacientes
        </h1>
      </div>

      {/* Search and Actions */}
      <div className="flex-none flex items-center justify-between gap-2 px-8 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {/* Search Field */}
          <div className="relative flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded w-85">
            <SearchIcon size={24} className="w-6 h-6 text-gray-600" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou CPF"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 text-xs text-gray-600 placeholder:text-gray-600 outline-none bg-transparent"
            />
          </div>

          {/* Filter Button */}
          <button className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 transition-colors">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 4h18M3 10h12M3 16h6"
              />
            </svg>
            <span className="text-sm text-black">Filtro</span>
          </button>
        </div>

        {/* New Button */}
        <button className="flex items-center justify-center gap-3 px-6 py-2 bg-teal-500 rounded hover:bg-teal-600 transition-colors">
          <span className="text-sm font-semibold text-white">
            Novo paciente
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Table Header */}
            <div className="flex items-center gap-4 px-8 py-3 pr-14 border-b border-gray-200">
              <Checkbox
                checked={
                  selectedItems.size === patients.length && patients.length > 0
                }
                onCheckedChange={handleSelectAll}
                indeterminate={
                  selectedItems.size > 0 && selectedItems.size < patients.length
                }
              />
              <span className="flex-1 text-xs text-black opacity-70">Nome</span>
              <span className="flex-1 text-xs text-black opacity-70">
                E-mail
              </span>
              <span className="flex-1 text-xs text-black opacity-70">CPF</span>
              <span className="flex-1 text-xs text-black opacity-70">
                Telefone
              </span>
              <span className="flex-1 text-xs text-black opacity-70">
                Data de Nascimento
              </span>
            </div>

            {/* Table Rows */}
            {getFilteredData().map((patient) => {
              const isSelected = selectedItems.has(patient.id);
              return (
                <div
                  key={patient.id}
                  className="flex items-center gap-4 px-8 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleSelectItem(patient.id)}
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${getRandomColor(
                        patient.id,
                      )}`}
                    >
                      {getInitials(patient.name)}
                    </div>
                    <span className="text-xs font-semibold text-black">
                      {patient.name}
                    </span>
                  </div>
                  <span className="flex-1 text-xs text-black">
                    {patient.email || "-"}
                  </span>
                  <span className="flex-1 text-xs text-black">
                    {patient.cpf || "-"}
                  </span>
                  <span className="flex-1 text-xs text-black">
                    {patient.phone || "-"}
                  </span>
                  <span className="flex-1 text-xs text-black">
                    {formatDate(patient.dateOfBirth)}
                  </span>
                  <button className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50">
                    <DotsMenuIcon size={16} className="text-gray-600" />
                  </button>
                </div>
              );
            })}

            {/* Empty State */}
            {getFilteredData().length === 0 && !loading && (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Nenhum paciente encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
