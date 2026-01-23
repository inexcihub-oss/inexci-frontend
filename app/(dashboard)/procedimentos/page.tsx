"use client";

import { useState, useMemo } from "react";
import PageContainer from "@/components/PageContainer";
import { SearchInput, Button } from "@/components/ui";
import Image from "next/image";
import { useDebounce } from "@/hooks";

// Tipo de procedimento
interface Procedure {
  id: string;
  modelName: string;
  procedureName: string;
  createdAt: string;
  createdBy: string;
  usageCount: number;
}

// Mock data baseado na imagem
const mockProcedures: Procedure[] = [
  {
    id: "1",
    modelName: "Artroplastia padrão Unimed",
    procedureName: "Artroplastia total de quadril",
    createdAt: "15/10/2025",
    createdBy: "Dr. Carlos Almeida",
    usageCount: 12,
  },
  {
    id: "2",
    modelName: "Artroplastia padrão Amil",
    procedureName: "Artroplastia parcial de joelho",
    createdAt: "22/11/2025",
    createdBy: "Dr. Ana Sousa",
    usageCount: 8,
  },
  {
    id: "3",
    modelName: "Artroplastia padrão Bradesco",
    procedureName: "Artroplastia total de joelho",
    createdAt: "05/12/2025",
    createdBy: "Dr. Marcos Silva",
    usageCount: 10,
  },
  {
    id: "4",
    modelName: "Artroplastia padrão SulAmérica",
    procedureName: "Artroplastia de ombro",
    createdAt: "18/01/2026",
    createdBy: "Dr. Fernanda Lima",
    usageCount: 7,
  },
  {
    id: "5",
    modelName: "Artroplastia padrão Itausa",
    procedureName: "Substituição total de quadril",
    createdAt: "30/01/2026",
    createdBy: "Dr. Roberto Dias",
    usageCount: 15,
  },
  {
    id: "6",
    modelName: "Artroplastia padrão Allianz",
    procedureName: "Revisão de artroplastia de joelho",
    createdAt: "12/02/2026",
    createdBy: "Dr. Patrícia Gomes",
    usageCount: 5,
  },
  {
    id: "7",
    modelName: "Artroplastia padrão Porto Seguro",
    procedureName: "Artroplastia de tornozelo",
    createdAt: "25/03/2026",
    createdBy: "Dr. Leonardo Costa",
    usageCount: 6,
  },
  {
    id: "8",
    modelName: "Artroplastia padrão Cassi",
    procedureName: "Artroplastia de quadril com enxerto",
    createdAt: "10/04/2026",
    createdBy: "Dr. Juliana Freitas",
    usageCount: 9,
  },
];

export default function ProcedimentosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Filtrar procedimentos baseado na busca
  const filteredProcedures = useMemo(() => {
    if (!debouncedSearchTerm) return mockProcedures;
    const search = debouncedSearchTerm.toLowerCase();
    return mockProcedures.filter(
      (proc) =>
        proc.modelName.toLowerCase().includes(search) ||
        proc.procedureName.toLowerCase().includes(search) ||
        proc.createdBy.toLowerCase().includes(search),
    );
  }, [debouncedSearchTerm]);

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-neutral-100">
        <h1 className="text-3xl font-semibold text-black font-urbanist">
          Procedimentos
        </h1>
      </div>

      {/* Search Bar */}
      <div className="px-8 py-4 border-b border-neutral-100">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Nome do procedimento"
          className="max-w-md"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_2fr_1fr_1.5fr_0.5fr_0.5fr] gap-4 px-4 py-3 bg-white border-b border-gray-200">
            <div className="text-sm font-medium text-gray-700">
              Nome do modelo
            </div>
            <div className="text-sm font-medium text-gray-700">
              Procedimento
            </div>
            <div className="text-sm font-medium text-gray-700">Criado em</div>
            <div className="text-sm font-medium text-gray-700">Criado por</div>
            <div className="text-sm font-medium text-gray-700">Usos</div>
            <div className="text-sm font-medium text-gray-700"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {filteredProcedures.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                Nenhum procedimento encontrado
              </div>
            ) : (
              filteredProcedures.map((procedure) => (
                <div
                  key={procedure.id}
                  className="grid grid-cols-[2fr_2fr_1fr_1.5fr_0.5fr_0.5fr] gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {procedure.modelName}
                  </div>
                  <div className="text-sm text-gray-700 truncate">
                    {procedure.procedureName}
                  </div>
                  <div className="text-sm text-gray-700">
                    {procedure.createdAt}
                  </div>
                  <div className="text-sm text-gray-700 truncate">
                    {procedure.createdBy}
                  </div>
                  <div className="text-sm text-gray-700">
                    {procedure.usageCount}
                  </div>
                  <div className="flex items-center justify-end">
                    <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                      <Image
                        src="/icons/dots-menu.svg"
                        alt="Menu"
                        width={20}
                        height={20}
                      />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
