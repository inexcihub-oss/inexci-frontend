"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { SurgeryRequestList } from "@/components/procedures/SurgeryRequestList";
import { CreateSurgeryRequestWizard } from "@/components/surgery-request/CreateSurgeryRequestWizard";
import {
  FilterModal,
  FilterState,
  DEFAULT_FILTERS,
  countActiveFilters,
} from "@/components/surgery-request/FilterModal";
import { KanbanColumn, SurgeryRequest } from "@/types/surgery-request.types";
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
import { getInitials, includesIgnoreCase } from "@/lib/utils";

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
  { id: "encerrada", title: "Encerrada", status: "Encerrada", cards: [] },
];

export default function ProcedimentosCirurgicos() {
  const router = useRouter();
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLoading] = useState(true);
  const [columns, setColumns] = useState<KanbanColumn[]>(INITIAL_COLUMNS);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Carregar dados do backend
  useEffect(() => {
    loadSurgeryRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

              if (record.procedure?.name) {
                return record.procedure.name;
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
              createdAt: (() => {
                const d = new Date(record.created_at);
                const dd = d.getDate().toString().padStart(2, "0");
                const mm = (d.getMonth() + 1).toString().padStart(2, "0");
                return `${dd}/${mm}/${d.getFullYear()}`;
              })(),
              deadline: record.deadline
                ? (() => {
                    const m = record.deadline.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (m)
                      return new Date(
                        +m[1],
                        +m[2] - 1,
                        +m[3],
                      ).toLocaleDateString("pt-BR");
                    return new Date(record.deadline).toLocaleDateString(
                      "pt-BR",
                    );
                  })()
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

        // Atualizar pendenciesCount com o validador real (async, sem bloquear o render)
        const allIds = mappedRequests.map((r) => r.id);
        if (allIds.length > 0) {
          pendencyService
            .getBatchSummary(allIds)
            .then((batchSummary) => {
              setColumns((prev) =>
                prev.map((col) => ({
                  ...col,
                  cards: col.cards.map((card) => {
                    const summary = batchSummary[card.id];
                    if (summary == null) return card;
                    return { ...card, pendenciesCount: summary.pending };
                  }),
                })),
              );
            })
            .catch(() => {
              // silently ignore — contagens estimadas do backend já estão no estado
            });
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
      setLoading(false);
    }
  }, []);

  // Dados derivados para o modal de filtros (convênios e procedimentos únicos)
  const availableHealthPlans = useMemo(() => {
    const map = new Map<string, string>();
    columns.forEach((col) =>
      col.cards.forEach((card) => {
        if (card.healthPlan) map.set(card.healthPlan, card.healthPlan);
      }),
    );
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [columns]);

  const availableProcedures = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    columns.forEach((col) =>
      col.cards.forEach((card) => {
        // Split composite procedure names (e.g. "Proc A +2")
        const base = card.procedureName.replace(/ \+\d+$/, "");
        if (base && !seen.has(base)) {
          seen.add(base);
          result.push({ id: base, name: base });
        }
      }),
    );
    return result;
  }, [columns]);

  // Filtrar colunas com base na busca E nos filtros
  const filteredColumns = useMemo(() => {
    // 1. Filtrar por status: ocultar colunas cujo status não está selecionado
    let cols =
      filters.statuses.length > 0
        ? columns.filter((col) => filters.statuses.includes(col.status))
        : columns;

    // 2. Filtrar cards
    cols = cols.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => {
        // Busca textual
        if (debouncedSearch.trim()) {
          const matchesSearch =
            includesIgnoreCase(card.patient.name, debouncedSearch) ||
            includesIgnoreCase(card.doctor.name, debouncedSearch) ||
            includesIgnoreCase(card.procedureName, debouncedSearch) ||
            includesIgnoreCase(card.id, debouncedSearch) ||
            includesIgnoreCase(
              `SC-${card.id.padStart(6, "0")}`,
              debouncedSearch,
            );
          if (!matchesSearch) return false;
        }

        // Prioridade
        if (
          filters.priorities.length > 0 &&
          !filters.priorities.includes(card.priority as any)
        ) {
          return false;
        }

        // Pendências
        if (filters.pendencies.length > 0) {
          const count = card.pendenciesCount;
          const matches = filters.pendencies.some((p) => {
            if (p === "none") return count === 0;
            if (p === "1") return count === 1;
            if (p === "2") return count === 2;
            if (p === "3+") return count >= 3;
            return false;
          });
          if (!matches) return false;
        }

        // Convênios
        if (
          filters.healthPlanIds.length > 0 &&
          !filters.healthPlanIds.includes(card.healthPlan || "")
        ) {
          return false;
        }

        // Procedimentos
        if (filters.procedureNames.length > 0) {
          const base = card.procedureName.replace(/ \+\d+$/, "");
          if (!filters.procedureNames.includes(base)) return false;
        }

        // Data de criação
        if (filters.createdAtFrom || filters.createdAtTo) {
          const parts = card.createdAt.split("/");
          if (parts.length === 3) {
            const cardDate = new Date(
              parseInt(parts[2]),
              parseInt(parts[1]) - 1,
              parseInt(parts[0]),
            );
            if (!isNaN(cardDate.getTime())) {
              const norm = (d: Date) =>
                new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
              const cardMs = norm(cardDate);
              const fromMs = filters.createdAtFrom
                ? norm(filters.createdAtFrom)
                : null;
              // Se só "from" está definido, tratar como dia exato
              const toMs = filters.createdAtTo
                ? norm(filters.createdAtTo)
                : filters.createdAtFrom
                  ? norm(filters.createdAtFrom)
                  : null;
              const [startMs, endMs] =
                fromMs !== null && toMs !== null
                  ? fromMs <= toMs
                    ? [fromMs, toMs]
                    : [toMs, fromMs]
                  : [fromMs, toMs];
              if (startMs !== null && cardMs < startMs) return false;
              if (endMs !== null && cardMs > endMs) return false;
            }
          }
        }

        return true;
      }),
    }));

    // 3. Ocultar colunas vazias quando há qualquer filtro ou busca ativa
    const hasActiveFilters =
      debouncedSearch.trim() ||
      filters.statuses.length > 0 ||
      filters.priorities.length > 0 ||
      filters.pendencies.length > 0 ||
      filters.healthPlanIds.length > 0 ||
      filters.procedureNames.length > 0 ||
      filters.createdAtFrom ||
      filters.createdAtTo;

    if (hasActiveFilters) {
      cols = cols.filter((col) => col.cards.length > 0);
    }

    return cols;
  }, [columns, debouncedSearch, filters]);

  // Obter todos os procedimentos para visualização em lista (já filtrados)
  const filteredProcedures = useMemo(() => {
    return filteredColumns.flatMap((column) => column.cards);
  }, [filteredColumns]);

  const handleProcedureClick = useCallback(
    (procedure: SurgeryRequest) => {
      router.push(`/solicitacao/${procedure.id}`);
    },
    [router],
  );

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex-none flex items-center gap-2 px-4 py-4 lg:py-6 border-b border-neutral-100">
        <h1 className="ds-page-title">Solicitações Cirúrgicos</h1>
      </div>

      {/* Toolbar */}
      <div className="flex-none border-b border-neutral-100 px-4 py-0 flex flex-wrap items-center justify-between gap-y-2">
        {/* View Toggle */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-2.5 px-3 py-4 min-h-[44px] transition-colors ${
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
            className={`flex items-center gap-2.5 px-3 py-4 min-h-[44px] transition-colors ${
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
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto pb-3 lg:pb-0">
          {/* Search */}
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por paciente, gestor, procedimento, ID..."
            className="w-full lg:w-85"
          />

          {/* Filter Button */}
          {(() => {
            const activeCount = countActiveFilters(filters);
            const isActive = activeCount > 0;
            return (
              <button
                onClick={() => setIsFilterOpen(true)}
                className={`flex items-center gap-1.5 h-11 px-3.5 py-2 border rounded-xl transition-colors min-h-[44px] ${
                  isActive
                    ? "border-teal-600 bg-teal-50 hover:bg-teal-100"
                    : "border-neutral-100 bg-white hover:bg-neutral-50"
                }`}
              >
                <Image
                  src="/icons/filter.svg"
                  alt="Filtro"
                  width={20}
                  height={20}
                  className={
                    isActive
                      ? "[filter:invert(29%)sepia(74%)saturate(485%)hue-rotate(134deg)brightness(92%)contrast(87%)]"
                      : ""
                  }
                />
                <span
                  className={`text-sm font-medium ${
                    isActive ? "text-teal-700" : "text-black"
                  }`}
                >
                  Filtro
                </span>
                {isActive && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-teal-700 text-white text-xs font-bold rounded-full">
                    {activeCount}
                  </span>
                )}
              </button>
            );
          })()}

          {/* Divider */}
          <div className="hidden lg:block w-px h-8 bg-neutral-100" />

          {/* Export Button */}
          <button className="hidden lg:flex items-center gap-1 h-11 px-3.5 py-2 border border-neutral-100 rounded-xl bg-white hover:bg-neutral-50 transition-colors">
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
            <span className="hidden sm:inline">Nova solicitação</span>
            <span className="sm:hidden">+ Nova</span>
          </Button>
        </div>
      </div>

      {/* Kanban Board ou Lista */}
      <div className="flex-1 overflow-hidden px-2 lg:px-4 py-4 flex flex-col">
        {view === "kanban" ? (
          filteredColumns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center">
                <Image
                  src="/icons/filter.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="opacity-40"
                />
              </div>
              <p className="text-base font-semibold text-neutral-700">
                Nenhuma solicitação encontrada
              </p>
              <p className="text-sm text-neutral-400 text-center max-w-xs">
                Nenhuma solicitação corresponde aos filtros selecionados. Tente
                ajustar ou limpar os filtros.
              </p>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-1 text-sm font-medium text-teal-700 hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <KanbanBoard initialColumns={filteredColumns} />
          )
        ) : (
          <SurgeryRequestList
            requests={filteredProcedures}
            hasActiveFilters={
              countActiveFilters(filters) > 0 ||
              debouncedSearch.trim().length > 0
            }
            onRequestClick={handleProcedureClick}
            onClearFilters={() => {
              setFilters(DEFAULT_FILTERS);
              setSearchTerm("");
            }}
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

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(newFilters) => setFilters(newFilters)}
        onClear={() => {
          setFilters(DEFAULT_FILTERS);
          setIsFilterOpen(false);
        }}
        currentFilters={filters}
        availableHealthPlans={availableHealthPlans}
        availableProcedures={availableProcedures}
      />
    </PageContainer>
  );
}
