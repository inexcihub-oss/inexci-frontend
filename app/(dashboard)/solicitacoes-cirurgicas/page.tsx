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
import { pendencyService } from "@/services/pendency.service";
import { useDebounce } from "@/hooks";
import { SearchInput } from "@/components/ui";
import Image from "next/image";
import Button from "@/components/ui/Button";
import PageContainer from "@/components/PageContainer";
import {
  formatDateWithMonth,
  getInitials,
  includesIgnoreCase,
} from "@/lib/utils";

const INITIAL_COLUMNS: KanbanColumn[] = [
  { id: "pendente", title: "Pendente", status: "Pendente", cards: [] },
  { id: "enviada", title: "Enviada", status: "Enviada", cards: [] },
  { id: "em-analise", title: "Em Análise", status: "Em Análise", cards: [] },
  {
    id: "em-reanalise",
    title: "Em Reanálise",
    status: "Em Reanálise",
    cards: [],
  },
  { id: "autorizada", title: "Autorizada", status: "Autorizada", cards: [] },
  { id: "agendada", title: "Agendada", status: "Agendada", cards: [] },
  { id: "a-faturar", title: "A Faturar", status: "A Faturar", cards: [] },
  { id: "faturada", title: "Faturada", status: "Faturada", cards: [] },
  { id: "finalizada", title: "Finalizada", status: "Finalizada", cards: [] },
  { id: "cancelada", title: "Cancelada", status: "Cancelada", cards: [] },
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
        // Coletar IDs para buscar pendências em lote
        const surgeryRequestIds = response.records.map((record: any) =>
          String(record.id),
        );

        // Buscar resumo de pendências em lote
        let pendencySummaries: Record<
          string,
          { pending: number; completed: number; total: number }
        > = {};
        if (surgeryRequestIds.length > 0) {
          try {
            pendencySummaries =
              await pendencyService.getBatchSummary(surgeryRequestIds);
          } catch (error) {
            console.error("Erro ao carregar pendências:", error);
          }
        }

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

            // Obter dados de pendências do resumo em lote
            const pendencySummary = pendencySummaries[String(record.id)] || {
              pending: 0,
              completed: 0,
              total: 0,
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
              pendenciesCount: pendencySummary.total,
              pendenciesCompleted: pendencySummary.completed,
              pendenciesWaiting: pendencySummary.pending,
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
    <PageContainer>
      {/* Header */}
      <div className="flex-none flex items-center gap-2 px-8 py-3 border-b border-neutral-100">
        <h1 className="text-3xl font-semibold text-black font-urbanist">
          Solicitações Cirúrgicas
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
            <Image src="/icons/grid.svg" alt="Kanban" width={24} height={24} />
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
            <Image src="/icons/list.svg" alt="Lista" width={24} height={24} />
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
            <Image
              src="/icons/filter.svg"
              alt="Filtro"
              width={20}
              height={20}
              className="mr-2"
            />
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
    </PageContainer>
  );
}
