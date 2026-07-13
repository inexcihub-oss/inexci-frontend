"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { exportToCsv, exportToPdf } from "@/lib/export-surgery-requests";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { SurgeryRequestList } from "@/components/procedures/SurgeryRequestList";
import { CreateSurgeryRequestWizard } from "@/components/surgery-request/CreateSurgeryRequestWizard";
import {
  FilterModal,
  FilterState,
  DEFAULT_FILTERS,
  countActiveFilters,
} from "@/components/surgery-request/FilterModal";
import {
  KanbanColumn,
  SurgeryRequest,
  PriorityLevel,
  PRIORITY,
} from "@/types/surgery-request.types";
import {
  surgeryRequestService,
  STATUS_NUMBER_TO_STRING,
  SurgeryRequestListItem,
} from "@/services/surgery-request.service";
import { useAvailableDoctors } from "@/hooks/useAvailableDoctors";
import { useDebounce } from "@/hooks";
import { SearchInput } from "@/components/ui";
import FacebookSkeleton from "@/components/ui/FacebookSkeleton";
import Image from "next/image";
import { NewSurgeryRequestButton } from "@/components/billing/NewSurgeryRequestButton";
import PageContainer from "@/components/PageContainer";
import { getInitials, includesIgnoreCase } from "@/lib/utils";
import { formatDateBR, getLatestActivityMs } from "@/lib/formatters";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationsContext } from "@/contexts/NotificationsContext";
import { availableDoctorsService } from "@/services/available-doctors.service";
import { NoActiveDoctorModal } from "@/components/surgery-request/NoActiveDoctorModal";
import { UploadDocumentModal } from "@/components/surgery-request/UploadDocumentModal";
import { ExtractFromDocumentResponse } from "@/types/surgery-request.types";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import {
  SC_FROM_DOCUMENT_EXTRACTION_KEY,
  setScFromDocumentStorage,
} from "@/lib/sc-from-document-background";

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

/** Query key do kanban — usada para invalidação após mutações (P10). */
const KANBAN_QUERY_KEY = ["surgery-requests", "kanban"] as const;

export default function ProcedimentosCirurgicos() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isAdmin, user } = useAuth();
  const { onSurgeryRequestChanged } = useNotificationsContext();
  const userId = user?.id;
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isNoActiveDoctorModalOpen, setIsNoActiveDoctorModalOpen] =
    useState(false);
  const [hasActiveDoctors, setHasActiveDoctors] = useState<boolean | null>(
    null,
  );
  const [checkingActiveDoctors, setCheckingActiveDoctors] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isUploadDocumentOpen, setIsUploadDocumentOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const exportRef = useRef<HTMLDivElement>(null);
  const { data: availableDoctorsData = [] } = useAvailableDoctors();
  const availableDoctors = availableDoctorsData.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  const debouncedSearch = useDebounce(searchTerm, 300);
  const docExtractionJobId = searchParams.get("docExtractionJobId");

  const hasActiveStatus = (status?: string) =>
    String(status ?? "").toLowerCase() === "active";

  const ensureAdminHasActiveDoctor = useCallback(async (): Promise<boolean> => {
    if (!isAdmin) return true;
    if (hasActiveDoctors !== null) return hasActiveDoctors;

    setCheckingActiveDoctors(true);
    try {
      const doctors = await availableDoctorsService.getDoctorsForAccount();
      const hasAtLeastOneActive = doctors.some((doctor) =>
        hasActiveStatus(doctor.status),
      );
      setHasActiveDoctors(hasAtLeastOneActive);
      return hasAtLeastOneActive;
    } catch {
      // Não bloquear por falha transitória de rede
      return true;
    } finally {
      setCheckingActiveDoctors(false);
    }
  }, [hasActiveDoctors, isAdmin]);

  const handleOpenNewRequest = useCallback(async () => {
    const canOpen = await ensureAdminHasActiveDoctor();
    if (!canOpen) {
      setIsNoActiveDoctorModalOpen(true);
      return;
    }
    setIsNewRequestOpen(true);
  }, [ensureAdminHasActiveDoctor]);

  const handleUploadDocumentSuccess = useCallback(
    (response: ExtractFromDocumentResponse) => {
      setIsUploadDocumentOpen(false);
      setScFromDocumentStorage(SC_FROM_DOCUMENT_EXTRACTION_KEY, response);
      router.push("/solicitacoes-cirurgicas/nova-via-documento");
    },
    [router],
  );

  useEffect(() => {
    if (!docExtractionJobId) return;

    let cancelled = false;

    void (async () => {
      try {
        const status =
          await surgeryRequestService.getExtractFromDocumentStatus(
            docExtractionJobId,
          );

        if (cancelled) return;

        if (status.status === "done") {
          setScFromDocumentStorage(
            SC_FROM_DOCUMENT_EXTRACTION_KEY,
            status.result,
          );
          router.replace("/solicitacoes-cirurgicas/nova-via-documento");
          return;
        }

        if (status.status === "error") {
          showToast(
            status.message ||
              "Não foi possível concluir a análise do documento. Tente novamente.",
            "error",
          );
          router.replace("/solicitacoes-cirurgicas");
          return;
        }

        showToast(
          "A análise do documento ainda está em andamento. Você receberá uma notificação quando concluir.",
          "info",
        );
        router.replace("/solicitacoes-cirurgicas");
      } catch {
        if (cancelled) return;
        showToast(
          "Não foi possível recuperar a análise do documento agora. Tente novamente.",
          "error",
        );
        router.replace("/solicitacoes-cirurgicas");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [docExtractionJobId, router, showToast]);

  // Fechar dropdown de exportação ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    if (isExportOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isExportOpen]);

  // Kanban via TanStack Query (P10): cache + dedup; invalidação após mutações.
  const { data: kanbanData, isFetching } = useQuery({
    queryKey: KANBAN_QUERY_KEY,
    queryFn: () => surgeryRequestService.getKanban(),
    refetchOnMount: "always",
  });

  const reloadKanban = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: KANBAN_QUERY_KEY });
  }, [queryClient]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSurgeryRequestChanged((payload) => {
      if (!payload?.surgeryRequestId) return;
      queryClient.invalidateQueries({ queryKey: KANBAN_QUERY_KEY });
    });

    return () => {
      unsubscribe();
    };
  }, [onSurgeryRequestChanged, queryClient, userId]);

  // Colunas derivadas dos dados do backend. `pendenciesCount` já vem calculado
  // pelo endpoint /kanban (item 3.4) — sem round-trip extra a getBatchSummary.
  const rawColumns = useMemo<KanbanColumn[]>(() => {
    const records = kanbanData?.records;
    if (!records || !Array.isArray(records)) return INITIAL_COLUMNS;

    const mappedRequests = records.map((record: SurgeryRequestListItem) => {
      const status = STATUS_NUMBER_TO_STRING[record.status] || "Pendente";

      const getProcedureName = () => {
        const isIndication = record["is_indication"] as boolean | undefined;
        const indicationName = record["indication_name"] as string | undefined;
        if (isIndication && indicationName) {
          return indicationName;
        }
        if (record.procedure?.name) {
          return record.procedure.name;
        }
        return "Procedimento não especificado";
      };

      const getDoctor = () => {
        if (record.doctor) {
          return {
            id: String(record.doctor.id),
            name: record.doctor.name,
          };
        }
        return { id: "0", name: "Não informado" };
      };

      const createdAtIso = record.createdAt;
      const lastStatusChangedAt =
        record.lastStatusChangedAt ??
        record.last_status_changed_at ??
        undefined;
      const updatedAt =
        record.updatedAt && !Number.isNaN(Date.parse(record.updatedAt))
          ? record.updatedAt
          : undefined;
      const lastActivityAt = lastStatusChangedAt
        ? formatDateBR(lastStatusChangedAt)
        : updatedAt
          ? formatDateBR(updatedAt)
          : formatDateBR(createdAtIso);

      const request: SurgeryRequest = {
        id: String(record.id),
        protocol: record.protocol || "",
        patient: {
          id: String(record.patient?.id ?? ""),
          name: record.patient?.name ?? "Não informado",
          initials: getInitials(record.patient?.name ?? ""),
        },
        procedureName: getProcedureName(),
        doctor: getDoctor(),
        priority: (record.priority as PriorityLevel) || PRIORITY.MEDIUM,
        pendenciesCount: record.pendenciesCount || 0,
        pendenciesCompleted: 0,
        pendenciesWaiting: 0,
        createdAt: formatDateBR(createdAtIso),
        lastActivityAt,
        lastStatusChangedAt,
        updatedAt,
        status,
        healthPlan: record.healthPlan?.name || "",
        hasIncompletePayment: record.hasIncompletePayment === true,
      };

      const sortTime = getLatestActivityMs(
        lastStatusChangedAt,
        updatedAt,
        createdAtIso,
      );

      return { request, sortTime };
    });

    return INITIAL_COLUMNS.map((column) => ({
      ...column,
      cards: mappedRequests
        .filter((entry) => entry.request.status === column.status)
        .sort((a, b) => b.sortTime - a.sortTime)
        .map((entry) => entry.request),
    }));
  }, [kanbanData]);

  // Dados derivados para o modal de filtros
  const availableHealthPlans = useMemo(() => {
    const map = new Map<string, string>();
    rawColumns.forEach((col) =>
      col.cards.forEach((card) => {
        if (card.healthPlan) map.set(card.healthPlan, card.healthPlan);
      }),
    );
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rawColumns]);

  const availableProcedures = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    rawColumns.forEach((col) =>
      col.cards.forEach((card) => {
        const base = card.procedureName.replace(/ \+\d+$/, "");
        if (base && !seen.has(base)) {
          seen.add(base);
          result.push({ id: base, name: base });
        }
      }),
    );
    return result;
  }, [rawColumns]);

  // Filtrar colunas com base na busca E nos filtros
  const filteredColumns = useMemo(() => {
    // 1. Filtrar por status: ocultar colunas cujo status não está selecionado
    let cols =
      filters.statuses.length > 0
        ? rawColumns.filter((col) => filters.statuses.includes(col.status))
        : rawColumns;

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
          !filters.priorities.includes(card.priority)
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

        // Médico
        if (
          filters.doctorIds.length > 0 &&
          !filters.doctorIds.includes(card.doctor.id)
        ) {
          return false;
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
      filters.doctorIds.length > 0 ||
      filters.createdAtFrom ||
      filters.createdAtTo;

    if (hasActiveFilters) {
      cols = cols.filter((col) => col.cards.length > 0);
    }

    return cols;
  }, [rawColumns, debouncedSearch, filters]);

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

  if (!kanbanData && isFetching) {
    return <FacebookSkeleton variant="list" />;
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex-none flex items-center gap-2 px-4 py-3 lg:py-6 border-b border-neutral-100">
        <h1 className="ds-page-title">Solicitações Cirúrgicas</h1>
      </div>

      {/* Toolbar */}
      <div className="flex-none border-b border-neutral-100 px-3 lg:px-4 py-0 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center sm:justify-between gap-y-0">
        {/* View Toggle */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-2 px-2.5 py-3 lg:gap-2.5 lg:px-3 lg:py-4 transition-colors ${
              view === "kanban"
                ? "border-b-[2px] lg:border-b-[3px] border-teal-700"
                : ""
            }`}
          >
            <Image
              src="/icons/grid.svg"
              alt="Kanban"
              width={18}
              height={18}
              className="lg:w-6 lg:h-6"
            />
            <span
              className={`text-xs lg:text-sm ${
                view === "kanban" ? "font-semibold" : ""
              } text-black`}
            >
              Kanban
            </span>
          </button>
          <button
            onClick={() => setView("lista")}
            className={`flex items-center gap-2 px-2.5 py-3 lg:gap-2.5 lg:px-3 lg:py-4 transition-colors ${
              view === "lista"
                ? "border-b-[2px] lg:border-b-[3px] border-teal-700"
                : ""
            }`}
          >
            <Image
              src="/icons/list.svg"
              alt="Lista"
              width={18}
              height={18}
              className="lg:w-6 lg:h-6"
            />
            <span
              className={`text-xs lg:text-sm ${
                view === "lista" ? "font-semibold" : ""
              } text-black`}
            >
              Lista
            </span>
          </button>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-wrap items-center gap-2 lg:gap-2.5 w-full lg:w-auto pb-3 lg:pb-0 pt-2 sm:pt-0">
          {/* Search */}
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por paciente, procedimento, ID..."
            className="w-full sm:flex-1 lg:w-85 lg:flex-none"
          />

          {/* Filter Button */}
          {(() => {
            const activeCount = countActiveFilters(filters);
            const isActive = activeCount > 0;
            return (
              <button
                onClick={() => setIsFilterOpen(true)}
                className={`flex items-center gap-1.5 h-9 lg:h-11 px-3 lg:px-3.5 py-1.5 lg:py-2 border rounded-xl transition-colors ${
                  isActive
                    ? "border-teal-600 bg-teal-50 hover:bg-teal-100"
                    : "border-neutral-100 bg-white hover:bg-neutral-50"
                }`}
              >
                <Image
                  src="/icons/filter.svg"
                  alt="Filtro"
                  width={16}
                  height={16}
                  className={`lg:w-5 lg:h-5 ${
                    isActive
                      ? "[filter:invert(29%)sepia(74%)saturate(485%)hue-rotate(134deg)brightness(92%)contrast(87%)]"
                      : ""
                  }`}
                />
                <span
                  className={`text-xs lg:text-sm font-medium ${
                    isActive ? "text-teal-700" : "text-black"
                  }`}
                >
                  Filtro
                </span>
                {isActive && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] lg:min-w-[20px] lg:h-5 px-1 lg:px-1.5 bg-teal-700 text-white text-[10px] lg:text-xs font-bold rounded-full">
                    {activeCount}
                  </span>
                )}
              </button>
            );
          })()}

          {/* Divider */}
          <div className="hidden lg:block w-px h-8 bg-neutral-100" />

          {/* Export Button */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setIsExportOpen((v) => !v)}
              className="flex items-center gap-1.5 h-9 lg:h-11 px-3 lg:px-3.5 py-1.5 lg:py-2 border border-neutral-100 rounded-xl bg-white hover:bg-neutral-50 transition-colors"
            >
              <Image
                src="/icons/download.svg"
                alt="Exportar"
                width={16}
                height={16}
                className="lg:w-6 lg:h-6"
              />
              <span className="text-xs lg:text-sm text-black">Exportar</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className={`ml-1 transition-transform ${isExportOpen ? "rotate-180" : ""}`}
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {isExportOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-neutral-100 rounded-xl shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => {
                    exportToPdf(filteredProcedures);
                    setIsExportOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-neutral-50 transition-colors"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  Exportar PDF
                </button>
                <button
                  onClick={() => {
                    exportToCsv(filteredProcedures);
                    setIsExportOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-neutral-50 transition-colors"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0f766e"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  Exportar CSV
                </button>
              </div>
            )}
          </div>

          {/* Upload document button */}
          <button
            type="button"
            onClick={() => setIsUploadDocumentOpen(true)}
            title="Criar solicitação a partir de documento"
            className="relative flex items-center gap-1.5 flex-1 sm:flex-none h-9 lg:h-11 px-3 lg:px-3.5 py-1.5 lg:py-2 text-xs lg:text-sm font-medium rounded-xl border border-neutral-100 bg-white text-black hover:bg-neutral-50 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <span className="lg:hidden">Via doc</span>
            <span className="hidden lg:inline">Via documento</span>
          </button>

          {/* New Request Button */}
          <NewSurgeryRequestButton
            onClick={handleOpenNewRequest}
            variant="primary"
            disabled={checkingActiveDoctors}
            className="flex-1 sm:flex-none h-9 lg:h-11 text-xs lg:text-sm"
          >
            <span className="lg:hidden">+ Solicitação</span>
            <span className="hidden lg:inline">Nova solicitação</span>
          </NewSurgeryRequestButton>
        </div>
      </div>

      {/* Kanban Board ou Lista */}
      <div className="flex-1 overflow-hidden px-3 sm:px-4 lg:px-4 py-4 flex flex-col">
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
          // Invalida o cache do kanban para refletir a nova solicitação (P10).
          reloadKanban();
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
        availableDoctors={availableDoctors}
      />

      <NoActiveDoctorModal
        isOpen={isNoActiveDoctorModalOpen}
        onClose={() => setIsNoActiveDoctorModalOpen(false)}
        onGoToCollaborators={() => {
          setIsNoActiveDoctorModalOpen(false);
          router.push("/colaboradores");
        }}
      />

      <UploadDocumentModal
        isOpen={isUploadDocumentOpen}
        onClose={() => setIsUploadDocumentOpen(false)}
        onSuccess={handleUploadDocumentSuccess}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </PageContainer>
  );
}
