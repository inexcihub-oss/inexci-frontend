"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { SurgeryRequestList } from "@/components/procedures/SurgeryRequestList";
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
    id: "em-agendamento",
    title: "Em Agendamento",
    status: "Em Agendamento",
    cards: [],
  },
  { id: "agendada", title: "Agendada", status: "Agendada", cards: [] },
  { id: "realizada", title: "Realizada", status: "Realizada", cards: [] },
  { id: "faturada", title: "Faturada", status: "Faturada", cards: [] },
  { id: "finalizada", title: "Finalizada", status: "Finalizada", cards: [] },
  { id: "cancelada", title: "Cancelada", status: "Cancelada", cards: [] },
];

export default function ProcedimentosCirurgicos() {
  const router = useRouter();
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

            // Obter o gestor da solicitação
            const getManager = () => {
              if (record.manager) {
                return {
                  id: String(record.manager.id),
                  name: record.manager.name,
                };
              }
              // Fallback para created_by se não houver gestor
              return {
                id: String(record.created_by?.id || 0),
                name: record.created_by?.name || "Não informado",
              };
            };

            return {
              id: String(record.id),
              protocol: record.protocol || "",
              patient: {
                id: String(record.patient.id),
                name: record.patient.name,
                initials: getInitials(record.patient.name),
              },
              procedureName: getProcedureName(),
              doctor: getManager(),
              priority: (record.priority || "Média") as any,
              pendenciesCount: record.pendenciesCount || 0,
              pendenciesCompleted: 0,
              pendenciesWaiting: 0,
              messagesCount: record.messagesCount || 0,
              attachmentsCount: record.attachmentsCount || 0,
              createdAt: new Date(record.created_at).toLocaleDateString(
                "pt-BR",
              ),
              deadline: record.deadline
                ? new Date(record.deadline).toLocaleDateString("pt-BR")
                : "",
              status,
              healthPlan: record.health_plan?.name || "",
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
          includesIgnoreCase(card.procedureName, debouncedSearch) ||
          includesIgnoreCase(card.id, debouncedSearch) ||
          includesIgnoreCase(`SC-${card.id.padStart(6, "0")}`, debouncedSearch),
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
        includesIgnoreCase(procedure.procedureName, debouncedSearch) ||
        (procedure.protocol &&
          includesIgnoreCase(procedure.protocol, debouncedSearch)) ||
        (procedure.protocol &&
          includesIgnoreCase(`SC-${procedure.protocol}`, debouncedSearch)),
    );
  }, [allProcedures, debouncedSearch]);

  const handleProcedureClick = useCallback(
    (procedure: SurgeryRequest) => {
      router.push(`/solicitacao/${procedure.id}`);
    },
    [router],
  );

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex-none flex items-center gap-2 px-4 py-6 border-b border-neutral-100">
        <h1 className="text-3xl font-semibold text-neutral-900 font-urbanist">
          Solicitações Cirúrgicos
        </h1>
      </div>

      {/* Toolbar */}
      <div className="flex-none border-b border-neutral-100 px-4 py-0 flex items-center justify-between">
        {/* View Toggle */}
        <div className="flex items-center">
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-2.5 px-3 py-4 ${
              view === "kanban" ? "border-b-[3px] border-teal-700" : ""
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
            className={`flex items-center gap-2.5 px-3 py-4 ${
              view === "lista" ? "border-b-[3px] border-teal-700" : ""
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
            placeholder="Buscar por paciente, gestor, procedimento, ID..."
            className="w-85"
          />

          {/* Filter Button - Estilo Figma */}
          <button className="flex items-center gap-1 h-10 px-3 py-2 border border-teal-700 rounded-lg bg-white hover:bg-teal-50 transition-colors">
            <Image
              src="/icons/filter.svg"
              alt="Filtro"
              width={24}
              height={24}
            />
            <span className="text-sm text-teal-700">Filtro</span>
            {/* Contador */}
            <div className="flex items-center justify-center w-6 h-6 bg-white border border-teal-700 rounded-full ml-1">
              <span className="text-xs font-semibold text-teal-700">5</span>
            </div>
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-neutral-100" />

          {/* Export Button */}
          <button className="flex items-center gap-1 h-10 px-3 py-2 border border-neutral-100 rounded-lg bg-white hover:bg-neutral-50 transition-colors">
            <Image
              src="/icons/download.svg"
              alt="Exportar"
              width={24}
              height={24}
            />
            <span className="text-sm text-black">Exportar</span>
          </button>

          {/* New Request Button */}
          <Button onClick={() => setIsNewRequestOpen(true)} variant="primary">
            Nova solicitação
          </Button>
        </div>
      </div>

      {/* Kanban Board ou Lista */}
      <div className="flex-1 overflow-hidden px-4 py-4 flex flex-col">
        {view === "kanban" ? (
          <KanbanBoard initialColumns={filteredColumns} />
        ) : (
          <SurgeryRequestList
            requests={filteredProcedures}
            onRequestClick={handleProcedureClick}
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
