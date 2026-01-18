"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ProcedureList } from "@/components/procedures/ProcedureList";
import { CreateSurgeryRequestWizard } from "@/components/surgery-request/CreateSurgeryRequestWizard";
import {
  KanbanColumn,
  SurgeryRequestStatus,
  SurgeryRequest,
} from "@/types/surgery-request.types";
import {
  surgeryRequestService,
  STATUS_NUMBER_TO_STRING,
} from "@/services/surgery-request.service";
import { useDebounce } from "@/hooks";
import { SearchInput, GridIcon, ListIcon, FilterIcon } from "@/components/ui";
import Button from "@/components/ui/Button";
import {
  formatDateWithMonth,
  getInitials,
  includesIgnoreCase,
} from "@/lib/utils";

const INITIAL_COLUMNS: KanbanColumn[] = [
  { id: "pendente", title: "Pendente", status: "Pendente", cards: [] },
  { id: "enviada", title: "Enviada", status: "Enviada", cards: [] },
  { id: "aprovada", title: "Aprovada", status: "Aprovada", cards: [] },
  { id: "recusada", title: "Recusada", status: "Recusada", cards: [] },
  { id: "concluida", title: "Concluída", status: "Concluída", cards: [] },
];

export default function ProcedimentosCirurgicos() {
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<KanbanColumn[]>(INITIAL_COLUMNS);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Carregar dados do backend
  useEffect(() => {
    loadSurgeryRequests();
  }, []);

  const loadSurgeryRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await surgeryRequestService.getAll();

      // Mapear os dados do backend para o formato do Kanban
      if (response && response.records && Array.isArray(response.records)) {
        const mappedRequests: SurgeryRequest[] = response.records.map(
          (record: any) => {
            const status = STATUS_NUMBER_TO_STRING[record.status] || "Pendente";

            // Obter nome do procedimento
            const getProcedureName = () => {
              if (record.is_indication && record.indication_name) {
                return record.indication_name;
              }

              if (record.procedures && record.procedures.length > 0) {
                const firstProcedure = record.procedures[0];
                if (firstProcedure.procedure && firstProcedure.procedure.name) {
                  if (record.procedures.length > 1) {
                    return `${firstProcedure.procedure.name} +${record.procedures.length - 1}`;
                  }
                  return firstProcedure.procedure.name;
                }
              }

              return "Procedimento não especificado";
            };

            return {
              id: String(record.id),
              patient: {
                id: String(record.patient.id),
                name: record.patient.name,
                initials: getInitials(record.patient.name),
              },
              procedureName: getProcedureName(),
              doctor: {
                id: String(record.responsible.id),
                name: record.responsible.name,
              },
              priority: "Média" as any,
              pendenciesCount: record._count?.pendencies || 0,
              messagesCount: 0,
              attachmentsCount: 0,
              createdAt: formatDateWithMonth(record.created_at),
              deadline: record.date_call
                ? formatDateWithMonth(record.date_call)
                : "-",
              status,
            };
          },
        );

        // Organizar os cards nas colunas corretas
        const newColumns = INITIAL_COLUMNS.map((column) => ({
          ...column,
          cards: mappedRequests.filter(
            (request) => request.status === column.status,
          ),
        }));

        setColumns(newColumns);
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
      setLoading(false);
    }
  }, []);

  // Filtrar procedimentos com base no termo de busca
  const filteredColumns = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return columns;
    }

    return columns.map((column) => ({
      ...column,
      cards: column.cards.filter(
        (card) =>
          includesIgnoreCase(card.patient.name, debouncedSearch) ||
          includesIgnoreCase(card.doctor.name, debouncedSearch) ||
          includesIgnoreCase(card.procedureName, debouncedSearch),
      ),
    }));
  }, [columns, debouncedSearch]);

  // Obter todos os procedimentos para visualização em lista
  const allProcedures = useMemo(() => {
    return columns.flatMap((column) => column.cards);
  }, [columns]);

  const filteredProcedures = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return allProcedures;
    }

    return allProcedures.filter(
      (procedure) =>
        includesIgnoreCase(procedure.patient.name, debouncedSearch) ||
        includesIgnoreCase(procedure.doctor.name, debouncedSearch) ||
        includesIgnoreCase(procedure.procedureName, debouncedSearch),
    );
  }, [allProcedures, debouncedSearch]);

  const handleProcedureClick = useCallback((procedure: SurgeryRequest) => {
    // Navegação ou modal de detalhes
  }, []);

  return (
    <div className="flex flex-col h-full bg-white border border-neutral-100 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex-none flex items-center gap-2 px-8 py-3 border-b border-neutral-100">
        <h1 className="text-3xl font-semibold text-black font-urbanist">
          Procedimentos Cirúrgicos
        </h1>
      </div>

      {/* Toolbar */}
      <div className="flex-none border-b border-neutral-100 px-8 py-0 flex items-center justify-between">
        {/* View Toggle */}
        <div className="flex items-center">
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-2 px-3 py-4 ${
              view === "kanban" ? "border-b-[3px] border-teal-500" : ""
            }`}
          >
            <GridIcon size={24} className="text-black" />
            <span
              className={`text-sm ${
                view === "kanban" ? "font-semibold" : ""
              } text-black`}
            >
              Kanban
            </span>
          </button>
          <button
            onClick={() => setView("lista")}
            className={`flex items-center gap-2 px-3 py-4 ${
              view === "lista" ? "border-b-[3px] border-teal-500" : ""
            }`}
          >
            <ListIcon size={24} className="text-black" />
            <span
              className={`text-sm ${
                view === "lista" ? "font-semibold" : ""
              } text-black`}
            >
              Lista
            </span>
          </button>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Paciente, médico ou procedimento"
            className="w-85"
          />

          {/* Divider */}
          <div className="w-px h-8 bg-neutral-100" />

          {/* Filter Button */}
          <Button variant="outline" size="md">
            <FilterIcon size={20} className="mr-2" />
            Filtro
          </Button>

          {/* New Request Button */}
          <Button onClick={() => setIsNewRequestOpen(true)} variant="primary">
            Nova solicitação
          </Button>
        </div>
      </div>

      {/* Kanban Board ou Lista */}
      <div className="flex-1 overflow-hidden px-8 py-4 flex flex-col">
        {view === "kanban" ? (
          <KanbanBoard initialColumns={filteredColumns} />
        ) : (
          <ProcedureList
            procedures={filteredProcedures}
            onProcedureClick={handleProcedureClick}
          />
        )}
      </div>

      {/* New Surgery Request Flow */}
      <CreateSurgeryRequestWizard
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        onSuccess={() => {
          // Recarregar dados do backend
          loadSurgeryRequests();
        }}
      />
    </div>
  );
}
