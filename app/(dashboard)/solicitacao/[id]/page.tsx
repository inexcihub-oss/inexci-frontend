"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AlertTriangle, Upload } from "lucide-react";
import {
  surgeryRequestService,
  Activity,
} from "@/services/surgery-request.service";
import {
  pendencyService,
  CalculatedPendency,
} from "@/services/pendency.service";
import {
  EditablePriority,
  EditableDoctor,
  StatusBadge,
} from "@/components/surgery-request/EditableFields";
import { useAvailableDoctors } from "@/hooks/useAvailableDoctors";
import { MedicalReportEditor } from "@/components/laudo/MedicalReportEditor";
import { SendRequestModal } from "@/components/surgery-request/SendRequestModal";
import { PrimaryActionButton } from "@/components/surgery-request/PrimaryActionButton";
import { StartAnalysisModal } from "@/components/surgery-request/modals/StartAnalysisModal";
import { UpdateAuthorizationsModal } from "@/components/surgery-request/modals/UpdateAuthorizationsModal";
import { EditDateOptionsModal } from "@/components/surgery-request/modals/EditDateOptionsModal";
import { RescheduleModal } from "@/components/surgery-request/modals/RescheduleModal";
import { DefineSurgeryDateModal } from "@/components/surgery-request/modals/DefineSurgeryDateModal";
import { SurgeryStatusModal } from "@/components/surgery-request/modals/SurgeryStatusModal";
import { InvoiceModal } from "@/components/surgery-request/modals/InvoiceModal";
import { ConfirmReceiptModal } from "@/components/surgery-request/modals/ConfirmReceiptModal";
import { ApplyDocumentExtractionModal } from "@/components/surgery-request/ApplyDocumentExtractionModal";

import PageContainer from "@/components/PageContainer";
import { InformacoesGeraisTab } from "@/components/surgery-request/tabs/InformacoesGeraisTab";
import { CodigoTussTab } from "@/components/surgery-request/tabs/CodigoTussTab";
import { OpmeTab } from "@/components/surgery-request/tabs/OpmeTab";
import { PosCirurgicoTab } from "@/components/surgery-request/tabs/PosCirurgicoTab";
import { FaturamentoTab } from "@/components/surgery-request/tabs/FaturamentoTab";
import { CloseRequestModal } from "@/components/surgery-request/modals/CloseRequestModal";
import { ConsentTermWarningModal } from "@/components/surgery-request/modals/ConsentTermWarningModal";
import {
  DocumentUploadModal,
  DocumentTypeEntry,
} from "@/components/documents/DocumentUploadModal";
import { DOCUMENT_FOLDERS } from "@/services/document.service";
import {
  NotificationConfirmModal,
  NotificationChannels,
} from "@/components/surgery-request/modals/NotificationConfirmModal";
import { getPendencyAction } from "@/lib/pendency-navigation";
import {
  ExtractFromDocumentResponse,
  PriorityLevel,
} from "@/types/surgery-request.types";
import { SolicitacaoProvider } from "@/contexts/SolicitacaoContext";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";
import { resolveSidebarTabFromQuery } from "@/lib/sidebar-tab";
import {
  SidebarTab,
  SolicitacaoSidebar,
} from "@/components/surgery-request/sidebar/SolicitacaoSidebar";
import {
  EXPORTABLE_STATUSES,
  PRE_SCHEDULED_STATUSES,
  STATUS_META,
  SurgeryRequestStatusCode,
  getStatusLabel,
  isStatusIn,
  reachedStatus,
} from "@/lib/surgery-request-status";
import {
  SolicitacaoAction,
  parseSolicitacaoAction,
} from "@/lib/solicitacao-actions";
import { computeReceiptTotals } from "@/lib/receipt-totals";
import { getApiErrorMessage } from "@/lib/http-error";
import { surgeryRequestKeys } from "@/lib/query-keys";
import { useDocExtractionJob } from "@/hooks/useDocExtractionJob";
import {
  SolicitacaoModalKind,
  useSolicitacaoModals,
} from "@/hooks/useSolicitacaoModals";
import FacebookSkeleton from "@/components/ui/FacebookSkeleton";
import { useToast } from "@/hooks/useToast";

type TabType =
  | "informacoes-gerais"
  | "codigo-tuss"
  | "opme"
  | "laudo"
  | "pos-cirurgico"
  | "faturamento";

const PENDENCY_KEY_TO_TAB: Partial<Record<string, TabType>> = {
  patient_data: "laudo",
  hospital_data: "informacoes-gerais",
  health_plan_data: "informacoes-gerais",
  diagnosis_data: "informacoes-gerais",
  tuss_procedures: "codigo-tuss",
  insert_tuss: "codigo-tuss",
  opme_items: "opme",
  insert_opme: "opme",
  medical_report: "laudo",
  confirm_receipt: "faturamento",
};

const TAB_PENDENCY_KEYS: Record<TabType, string[]> = {
  "informacoes-gerais": ["hospital_data"],
  "codigo-tuss": ["tuss_procedures"],
  opme: ["opme_items"],
  laudo: ["medical_report", "patient_data"],
  "pos-cirurgico": [],
  faturamento: ["confirm_receipt"],
};

type NotifiableAction = "send" | "startAnalysis" | "confirmDate";
const ACTION_NEXT_STATUS: Record<NotifiableAction, SurgeryRequestStatusCode> = {
  send: SurgeryRequestStatusCode.SENT,
  startAnalysis: SurgeryRequestStatusCode.IN_ANALYSIS,
  confirmDate: SurgeryRequestStatusCode.SCHEDULED,
};

function getSavedDateIndex(
  solicitacao: {
    selectedDateIndex?: number | null;
    scheduling?: { selectedDateIndex?: number | null } | null;
  } | null,
): number | null {
  if (!solicitacao) return null;
  const index =
    typeof solicitacao.selectedDateIndex === "number"
      ? solicitacao.selectedDateIndex
      : typeof solicitacao.scheduling?.selectedDateIndex === "number"
        ? solicitacao.scheduling.selectedDateIndex
        : null;
  return index !== null && index >= 0 && index <= 2 ? index : null;
}

const CONSENT_TERM_DOCUMENT_TYPES: readonly DocumentTypeEntry[] = [
  { key: "consent_term", label: "Termo de Consentimento" },
];

export default function SolicitacaoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const validTabs: TabType[] = [
    "informacoes-gerais",
    "codigo-tuss",
    "opme",
    "laudo",
    "pos-cirurgico",
    "faturamento",
  ];
  const tabFromUrl = searchParams.get("tab") as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(
    tabFromUrl && validTabs.includes(tabFromUrl)
      ? tabFromUrl
      : "informacoes-gerais",
  );

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("solicitacao-sidebar-open");
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const closeSidebar = () => setIsSidebarOpen(false);
  const {
    dragY: sidebarDragY,
    onTouchStart: sidebarTouchStart,
    onTouchMove: sidebarTouchMove,
    onTouchEnd: sidebarTouchEnd,
  } = useSwipeToClose(closeSidebar);

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("pendencias");

  useEffect(() => {
    const aba = resolveSidebarTabFromQuery(searchParams.get("sidebar"));
    if (!aba) return;
    setSidebarTab(aba);
    setIsSidebarOpen(true);
  }, [searchParams]);

  const {
    data: solicitacao = null,
    isLoading: loading,
    isFetching,
  } = useQuery({
    queryKey: surgeryRequestKeys.detail(id),
    queryFn: () => surgeryRequestService.getById(id),
    enabled: !!id,
  });

  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(),
  );

  const { data: validation = null, isFetching: loadingPendencies } = useQuery({
    queryKey: surgeryRequestKeys.pendencies(id),
    queryFn: () => pendencyService.validate(id),
    enabled: !!id,
  });

  const { showToast } = useToast();

  const modals = useSolicitacaoModals();
  const closeModal = (kind: SolicitacaoModalKind) => () => modals.close(kind);

  const [documentExtractionInitialResult, setDocumentExtractionInitialResult] =
    useState<ExtractFromDocumentResponse | null>(null);
  const [pendingDateIndex, setPendingDateIndex] = useState<number | null>(null);
  const [isSavingDate, setIsSavingDate] = useState(false);

  const { data: availableDoctors = [] } = useAvailableDoctors();

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (isExportingPdf || !solicitacao) return;
    setIsExportingPdf(true);
    try {
      const blob = await surgeryRequestService.exportPdf(solicitacao.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      showToast(
        getApiErrorMessage(e, "Não foi possível gerar o PDF. Tente novamente."),
        "error",
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const [completedActionStatus, setCompletedActionStatus] = useState<{
    previous: string;
    next: string;
    previousNumber: number;
  } | null>(null);

  const { data: activities = [], isFetching: loadingActivities } = useQuery({
    queryKey: surgeryRequestKeys.activities(id),
    queryFn: () => surgeryRequestService.getActivities(id),
    enabled: !!id,
  });
  const listaAtividadesRef = useRef<HTMLDivElement>(null);
  const mobileInfoCardsRef = useRef<HTMLDivElement>(null);
  const [highlightedPendency, setHighlightedPendency] =
    useState<CalculatedPendency | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileCardsCanScrollLeft, setMobileCardsCanScrollLeft] =
    useState(false);
  const [mobileCardsCanScrollRight, setMobileCardsCanScrollRight] =
    useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "solicitacao-sidebar-open",
        JSON.stringify(isSidebarOpen),
      );
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    const pedidoNaUrl =
      typeof window !== "undefined"
        ? resolveSidebarTabFromQuery(
            new URLSearchParams(window.location.search).get("sidebar"),
          )
        : null;
    if (pedidoNaUrl) return;

    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  const savedDateIndex = getSavedDateIndex(solicitacao);

  useEffect(() => {
    if (savedDateIndex !== null) {
      setPendingDateIndex(savedDateIndex);
    }
  }, [savedDateIndex]);

  const handleUpdateProcedure = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: surgeryRequestKeys.detail(id),
    });
    queryClient.invalidateQueries({ queryKey: surgeryRequestKeys.kanban() });
    queryClient.invalidateQueries({ queryKey: surgeryRequestKeys.agenda() });
  }, [queryClient, id]);

  useEffect(() => {
    const lista = listaAtividadesRef.current;
    if (!lista || activities.length === 0) return;

    lista.scrollTo({ top: lista.scrollHeight, behavior: "smooth" });
  }, [activities]);

  const updateMobileCardsScrollHints = useCallback(() => {
    const el = mobileInfoCardsRef.current;
    if (!el) return;

    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setMobileCardsCanScrollLeft(el.scrollLeft > 2);
    setMobileCardsCanScrollRight(el.scrollLeft < maxScrollLeft - 2);
  }, []);

  useEffect(() => {
    const el = mobileInfoCardsRef.current;
    if (!el) return;

    updateMobileCardsScrollHints();
    el.addEventListener("scroll", updateMobileCardsScrollHints, {
      passive: true,
    });
    window.addEventListener("resize", updateMobileCardsScrollHints);

    return () => {
      el.removeEventListener("scroll", updateMobileCardsScrollHints);
      window.removeEventListener("resize", updateMobileCardsScrollHints);
    };
  }, [updateMobileCardsScrollHints, solicitacao?.id]);

  const selectTab = (tab: TabType) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const handlePendencyClick = (key: string) => {
    const targetTab = PENDENCY_KEY_TO_TAB[key];
    if (!targetTab) return;

    setActiveTab(targetTab);

    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }

    const pendency = validation?.pendencies?.find((p) => p.key === key) ?? null;

    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedPendency(pendency);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedPendency(null);
    }, 5000);

    const action = getPendencyAction(key);
    if (action?.type === "scroll" && action.target) {
      setTimeout(() => {
        const el = document.getElementById(action.target);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          el.classList.add("ring-2", "ring-primary-500", "ring-offset-2");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-primary-500", "ring-offset-2");
          }, 2000);
        }
      }, 150);
    }
  };

  const hasPatientContact =
    !!solicitacao?.patient?.phone || !!solicitacao?.patient?.email;

  const showPostTransitionNotification = (
    action: NotifiableAction,
    previousStatusNum: number,
  ) => {
    if (!hasPatientContact) {
      return;
    }

    if (isStatusIn(previousStatusNum, PRE_SCHEDULED_STATUSES)) {
      setCompletedActionStatus({
        previous:
          getStatusLabel(previousStatusNum) ?? String(previousStatusNum),
        next: STATUS_META[ACTION_NEXT_STATUS[action]].label,
        previousNumber: previousStatusNum,
      });
      modals.open("notification");
    }
  };

  const handleNotificationConfirm = async (
    channels: NotificationChannels | null,
  ) => {
    modals.close("notification");
    if (channels) {
      try {
        await surgeryRequestService.notify(solicitacao!.id, {
          template: "status-change-patient",
          channels,
          oldStatus: completedActionStatus?.previousNumber,
        });
      } catch (e) {
        showToast(
          getApiErrorMessage(e, "Não foi possível notificar o paciente."),
          "error",
        );
      }
    }
    setCompletedActionStatus(null);
  };

  const handleConfirmDate = async (
    skipConsentCheck = false,
    dateIndex: number | null = pendingDateIndex,
  ) => {
    const dateOptions =
      solicitacao?.scheduling?.dateOptions ?? solicitacao?.dateOptions ?? [];
    if (dateOptions.length > 0 && dateIndex === null) {
      selectTab("informacoes-gerais");
      showToast(
        "Selecione uma das datas sugeridas para confirmar o agendamento.",
        "warning",
      );
      return;
    }
    const hasConsentTerm = solicitacao?.documents?.some(
      (d) => d.key === "consent_term",
    );
    if (!skipConsentCheck && !hasConsentTerm) {
      modals.open("consentWarning");
      return;
    }
    modals.close("consentWarning");
    if (dateOptions.length === 0) {
      modals.open("defineDate");
      return;
    }
    setIsSavingDate(true);
    const previousStatusNum = solicitacao?.status ?? 0;
    try {
      await surgeryRequestService.confirmDate(solicitacao!.id, {
        selectedDateIndex: dateIndex as 0 | 1 | 2,
      });
      setPendingDateIndex(null);
      handleUpdateProcedure();
      showPostTransitionNotification("confirmDate", previousStatusNum);
    } catch (e) {
      showToast(
        getApiErrorMessage(e, "Não foi possível confirmar a data."),
        "error",
      );
    } finally {
      setIsSavingDate(false);
    }
  };

  const urlActionHandlers: Record<SolicitacaoAction, () => void> = {
    send: () => modals.open("send"),
    "start-analysis": () => modals.open("startAnalysis"),
    "update-authorizations": () => modals.open("updateAuthorizations"),
    "confirm-date": () => handleConfirmDate(false, savedDateIndex),
    "surgery-status": () => modals.open("surgeryStatus"),
    invoice: () => modals.open("invoice"),
    "confirm-receipt": () => modals.open("confirmReceipt"),
    close: () => modals.open("close"),
  };
  const urlActionHandlersRef = useRef(urlActionHandlers);
  urlActionHandlersRef.current = urlActionHandlers;

  const hasSolicitacao = solicitacao !== null;
  const rawAction = searchParams.get("action");

  useEffect(() => {
    if (!hasSolicitacao || !rawAction) return;

    router.replace(`/solicitacao/${params.id}`, { scroll: false });

    const action = parseSolicitacaoAction(rawAction);
    if (action) urlActionHandlersRef.current[action]();
  }, [hasSolicitacao, rawAction, router, params.id]);

  useDocExtractionJob(searchParams.get("applyDocExtractionJobId"), {
    enabled: hasSolicitacao,
    notify: showToast,
    onStart: () =>
      router.replace(`/solicitacao/${params.id}`, { scroll: false }),
    onDone: (result) => {
      setDocumentExtractionInitialResult(result);
      modals.open("documentReview");
    },
  });

  const handleSelectDocument = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAllDocuments = () => {
    if (solicitacao?.documents && solicitacao.documents.length > 0) {
      if (selectedDocuments.size === solicitacao.documents.length) {
        setSelectedDocuments(new Set());
      } else {
        setSelectedDocuments(
          new Set(solicitacao.documents.map((doc) => doc.id)),
        );
      }
    }
  };

  if (!solicitacao && (loading || isFetching)) {
    return <FacebookSkeleton variant="details" />;
  }

  if (!solicitacao) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Solicitação não encontrada.</div>
      </div>
    );
  }

  const { hasPartialReceipt: hasPartialBillingPending } = computeReceiptTotals(
    solicitacao.billing,
    solicitacao.receipt,
  );

  const getTabWarning = (tabId: TabType): boolean => {
    if (!validation || !validation.pendencies) return false;

    const pendencyKeys = TAB_PENDENCY_KEYS[tabId];

    const hasValidationWarning = validation.pendencies.some(
      (pendency) =>
        pendencyKeys.includes(pendency.key) &&
        !pendency.isComplete &&
        !pendency.isOptional,
    );

    if (tabId === "faturamento") {
      return hasValidationWarning || hasPartialBillingPending;
    }

    return hasValidationWarning;
  };

  const statusNum: number = solicitacao.status;

  const tabs = [
    {
      id: "informacoes-gerais" as TabType,
      label: "Informações Gerais",
      hasWarning: getTabWarning("informacoes-gerais"),
    },
    {
      id: "codigo-tuss" as TabType,
      label: "Código TUSS",
      hasWarning: getTabWarning("codigo-tuss"),
    },
    {
      id: "opme" as TabType,
      label: "OPME",
      hasWarning: getTabWarning("opme"),
    },
    {
      id: "laudo" as TabType,
      label: "Laudo",
      hasWarning: getTabWarning("laudo"),
    },
    ...(reachedStatus(solicitacao, SurgeryRequestStatusCode.PERFORMED)
      ? [
          {
            id: "pos-cirurgico" as TabType,
            label: "Pós Cirúrgico",
            hasWarning: false,
          },
        ]
      : []),
    ...(reachedStatus(solicitacao, SurgeryRequestStatusCode.INVOICED)
      ? [
          {
            id: "faturamento" as TabType,
            label: "Faturamento",
            hasWarning: getTabWarning("faturamento"),
          },
        ]
      : []),
  ];

  return (
    <PageContainer constrainMobileHeight>
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between px-4 lg:px-6 py-0 border-b border-neutral-100 h-13">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Voltar para o kanban"
                onClick={() => router.push("/solicitacoes-cirurgicas")}
                className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center border border-[#DCDFE3] rounded-xl md:rounded-lg shadow-sm hover:bg-gray-50 active:scale-[0.95] transition-all p-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 18L9 12L15 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="flex items-center min-w-0">
                <div className="hidden md:flex items-center justify-center px-2 py-4">
                  <span className="text-sm text-gray-900">Kanban</span>
                </div>
                <svg
                  className="hidden md:block w-6 h-6 text-gray-400 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M10 8L14 12L10 16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex items-center gap-1 px-2 py-4 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {solicitacao.patient?.name || "Sem nome"}
                  </span>
                  <span className="hidden md:inline text-sm text-gray-900">
                    ({solicitacao.procedure?.name || "Sem procedimento"})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-px h-6 bg-gray-200"></div>

              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`w-10 h-10 md:w-8 md:h-8 flex items-center justify-center hover:bg-teal-50 active:scale-[0.95] transition-all rounded-xl ${isSidebarOpen ? "border border-[#DCDFE3] shadow-sm" : ""}`}
                title={isSidebarOpen ? "Fechar painel" : "Abrir painel"}
              >
                {isSidebarOpen ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 18L15 12L9 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 5H7C6.46957 5 5.96086 5.21071 5.58579 5.58579C5.21071 5.96086 5 6.46957 5 7V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V7C19 6.46957 18.7893 5.96086 18.4142 5.58579C18.0391 5.21071 17.5304 5 17 5H15"
                      stroke="#111111"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 5C9 4.46957 9.21071 3.96086 9.58579 3.58579C9.96086 3.21071 10.4696 3 11 3H13C13.5304 3 14.0391 3.21071 14.4142 3.58579C14.7893 3.96086 15 4.46957 15 5C15 5.53043 14.7893 6.03914 14.4142 6.41421C14.0391 6.78929 13.5304 7 13 7H11C10.4696 7 9.96086 6.78929 9.58579 6.41421C9.21071 6.03914 9 5.53043 9 5Z"
                      stroke="#111111"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 12L11 14L15 10"
                      stroke="#111111"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none pb-2.5">
            <div className="px-4 lg:px-6 pt-4 pb-4 space-y-4">
              <div
                className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{
                  backgroundImage:
                    "linear-gradient(162deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%), repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,0,0,0.03) 20px, rgba(0,0,0,0.03) 21px)",
                  backgroundSize: "100%, 20px 20px",
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center">
                    <span className="text-sm lg:text-base font-semibold text-gray-600">
                      {solicitacao.patient?.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("") || "??"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg text-gray-900 font-semibold leading-tight tracking-tight truncate">
                      {solicitacao.patient?.name || "Sem nome"}
                    </h2>
                    <p className="text-xs text-gray-500 leading-normal truncate">
                      {solicitacao.procedure?.name || "Sem procedimento"}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex-shrink-0 flex items-center gap-2 min-w-0">
                  {isStatusIn(statusNum, EXPORTABLE_STATUSES) && (
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={isExportingPdf}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[36px] md:min-h-[44px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs md:text-sm font-semibold text-gray-700 shadow-sm whitespace-nowrap"
                    >
                      {isExportingPdf ? (
                        <svg
                          className="w-4 h-4 animate-spin flex-shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeDasharray="28"
                            strokeDashoffset="9"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 flex-shrink-0 text-gray-500"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M12 3v13M8 12l4 4 4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      {isExportingPdf ? "Gerando…" : "Exportar PDF"}
                    </button>
                  )}
                  {statusNum === SurgeryRequestStatusCode.PENDING && (
                    <button
                      type="button"
                      onClick={() => modals.open("documentReview")}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[36px] md:min-h-[44px] rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 active:scale-[0.98] transition-all text-xs md:text-sm font-semibold text-teal-800 whitespace-nowrap"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="hidden sm:inline">Completar com documento</span>
                      <span className="sm:hidden">Documento</span>
                    </button>
                  )}
                  <PrimaryActionButton
                    status={statusNum}
                    onSendRequest={() => modals.open("send")}
                    onStartAnalysis={() => modals.open("startAnalysis")}
                    onUpdateAuthorizations={() =>
                      modals.open("updateAuthorizations")
                    }
                    onConfirmDate={() => handleConfirmDate()}
                    onSurgeryStatus={() => modals.open("surgeryStatus")}
                    onInvoice={() => modals.open("invoice")}
                    onConfirmReceipt={() => modals.open("confirmReceipt")}
                  />
                </div>
              </div>

              <div className="relative">
                <div
                  ref={mobileInfoCardsRef}
                  className="flex gap-3 overflow-x-auto overflow-y-visible snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:snap-none lg:grid-cols-3 lg:gap-4"
                >
                  <div className="relative z-20 w-full min-w-full shrink-0 snap-start sm:min-w-0 sm:shrink flex flex-col gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <div className="flex items-center gap-1.5 h-5">
                      <Image
                        src="/icons/view-kanban.svg"
                        alt="Status"
                        width={16}
                        height={16}
                        className="text-gray-600"
                      />
                      <span className="font-semibold text-gray-900 text-xs">
                        Status
                      </span>
                    </div>
                    <div className="flex items-center min-h-[28px]">
                      <StatusBadge status={solicitacao.status} />
                    </div>
                  </div>

                  <div className="w-full min-w-full shrink-0 snap-start sm:min-w-0 sm:shrink flex flex-col gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <div className="flex items-center gap-1.5 h-5">
                      <Image
                        src="/icons/flag.svg"
                        alt="Prioridade"
                        width={16}
                        height={16}
                        className="text-gray-600"
                      />
                      <span className="font-semibold text-gray-900 text-xs">
                        Prioridade
                      </span>
                    </div>
                    <div className="relative z-30 flex items-center min-h-[28px]">
                      <EditablePriority
                        initialValue={solicitacao.priority as PriorityLevel}
                        surgeryRequestId={solicitacao.id}
                        onUpdate={handleUpdateProcedure}
                      />
                    </div>
                  </div>

                  <div className="w-full min-w-full shrink-0 snap-start sm:min-w-0 sm:shrink flex flex-col gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <div className="flex items-center gap-1.5 h-5">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="#111111"
                        xmlns="http://www.w3.org/2000/svg"
                        className="flex-shrink-0"
                      >
                        <path d="M9 21q-1.65 0-2.825-1.175T5 17q0-1.425.838-2.475T8 13.2V9.8q-1.325-.4-2.163-1.45T5 6q0-1.65 1.175-2.825T9 2q1.65 0 2.825 1.175T13 6q0 1.4-.838 2.45T10 9.8v3.4q1.325.4 2.163 1.45T13 17q0 1.65-1.175 2.825T9 21Zm0-2q.825 0 1.413-.588T11 17q0-.825-.588-1.413T9 15q-.825 0-1.413.588T7 17q0 .825.588 1.413T9 19Zm0-11q.825 0 1.413-.588T11 6q0-.825-.588-1.413T9 3q-.825 0-1.413.588T7 6q0 .825.588 1.413T9 7Zm0 3q.4 0 .7-.3T10 9q0-.4-.3-.7T9 8q-.4 0-.7.3T8 9q0 .4.3.7T9 10Zm3-4h1q.825 0 1.413.588T15 8v5.075q1.325.375 2.163 1.425T18 17q0 1.65-1.175 2.825T14 21q-1.65 0-2.825-1.175T10 17q0-1.425.838-2.475T13 13.075V8h-1V6Zm2 11q.825 0 1.413-.588T16 17q0-.825-.588-1.413T14 15q-.825 0-1.413.588T12 17q0 .825.588 1.413T14 19Z" />
                      </svg>
                      <span className="font-semibold text-gray-900 text-xs">
                        Médico
                      </span>
                    </div>
                    <div className="flex items-center min-h-[28px]">
                      {solicitacao.doctor ? (
                        <EditableDoctor
                          currentDoctorId={solicitacao.doctor.id}
                          currentDoctorName={solicitacao.doctor.name}
                          surgeryRequestId={solicitacao.id}
                          availableDoctors={availableDoctors}
                          onUpdate={handleUpdateProcedure}
                          disabled={
                            solicitacao.status !==
                            SurgeryRequestStatusCode.PENDING
                          }
                        />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {(mobileCardsCanScrollLeft || mobileCardsCanScrollRight) && (
                  <div className="sm:hidden mt-1 px-1">
                    <p className="text-[11px] text-gray-400 leading-none">
                      {mobileCardsCanScrollRight
                        ? "Deslize para ver mais"
                        : "Deslize para voltar"}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center border-b border-neutral-100 -mx-4 lg:-mx-6 px-4 lg:px-6 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => selectTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] -mb-px ${
                      activeTab === tab.id
                        ? "text-black border-b-[3px] border-teal-700"
                        : "text-gray-500 hover:text-black"
                    }`}
                  >
                    {tab.label}
                    {tab.hasWarning && (
                      <AlertTriangle
                        aria-label="Aviso"
                        className="w-4 h-4 text-amber-500"
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="pb-4">
                {highlightedPendency && !highlightedPendency.isComplete && (
                  <div className="mb-3 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 animate-pulse">
                    <svg
                      className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-800 leading-snug">
                        {highlightedPendency.name}
                      </p>
                      {highlightedPendency.checkItems
                        ?.filter((ci) => !ci.done)
                        .map((ci, i) => (
                          <p
                            key={i}
                            className="text-xs text-amber-700 mt-0.5 leading-snug"
                          >
                            • {ci.label}
                          </p>
                        ))}
                      {!highlightedPendency.checkItems?.some(
                        (ci) => !ci.done,
                      ) && (
                        <p className="text-xs text-amber-700 mt-0.5 leading-snug">
                          {highlightedPendency.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Fechar aviso de pendência"
                      onClick={() => setHighlightedPendency(null)}
                      className="text-amber-400 hover:text-amber-600 flex-shrink-0 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M18 6L6 18M6 6L18 18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                <SolicitacaoProvider
                  solicitacao={solicitacao}
                  statusNum={statusNum}
                  onUpdate={handleUpdateProcedure}
                >
                  {activeTab === "informacoes-gerais" && (
                    <InformacoesGeraisTab
                      selectedDocuments={selectedDocuments}
                      handleSelectDocument={handleSelectDocument}
                      handleSelectAllDocuments={handleSelectAllDocuments}
                      pendingDateIndex={pendingDateIndex}
                      onSelectDate={setPendingDateIndex}
                      onEditDateOptions={() => modals.open("editDateOptions")}
                      onReschedule={() => modals.open("reschedule")}
                    />
                  )}
                  {activeTab === "codigo-tuss" && <CodigoTussTab />}
                  {activeTab === "opme" && <OpmeTab />}
                  {activeTab === "laudo" && <MedicalReportEditor />}
                  {activeTab === "pos-cirurgico" && <PosCirurgicoTab />}
                  {activeTab === "faturamento" && <FaturamentoTab />}
                </SolicitacaoProvider>
              </div>
            </div>
          </div>
        </div>

        {isSidebarOpen && (
          <SolicitacaoSidebar
            solicitacao={solicitacao}
            tab={sidebarTab}
            onTabChange={setSidebarTab}
            onClose={closeSidebar}
            dragY={sidebarDragY}
            onTouchStart={sidebarTouchStart}
            onTouchMove={sidebarTouchMove}
            onTouchEnd={sidebarTouchEnd}
            activities={activities}
            loadingActivities={loadingActivities}
            activitiesListRef={listaAtividadesRef}
            onActivitySent={(criada) => {
              queryClient.setQueryData<Activity[]>(
                surgeryRequestKeys.activities(id),
                (prev) => [...(prev ?? []), criada],
              );
            }}
            validation={validation}
            loadingPendencies={loadingPendencies}
            onPendencyClick={handlePendencyClick}
          />
        )}
      </div>

      <NotificationConfirmModal
        isOpen={modals.isOpen("notification") && hasPatientContact}
        onClose={() => {
          modals.close("notification");
          setCompletedActionStatus(null);
        }}
        currentStatus={completedActionStatus?.previous ?? ""}
        newStatus={completedActionStatus?.next ?? ""}
        onConfirm={handleNotificationConfirm}
        patientEmail={solicitacao.patient?.email}
        patientPhone={solicitacao.patient?.phone}
      />

      <SendRequestModal
        isOpen={modals.isOpen("send")}
        onClose={closeModal("send")}
        solicitacao={solicitacao}
        initialValidation={validation ?? undefined}
        onSuccess={() => {
          const prevStatus = solicitacao.status;
          handleUpdateProcedure();
          modals.close("send");
          showPostTransitionNotification("send", prevStatus);
        }}
      />

      <ApplyDocumentExtractionModal
        isOpen={modals.isOpen("documentReview")}
        onClose={() => {
          modals.close("documentReview");
          setDocumentExtractionInitialResult(null);
        }}
        solicitation={solicitacao}
        onSuccess={handleUpdateProcedure}
        initialResult={documentExtractionInitialResult ?? undefined}
      />

      <StartAnalysisModal
        isOpen={modals.isOpen("startAnalysis")}
        onClose={closeModal("startAnalysis")}
        surgeryRequestId={solicitacao.id}
        onSuccess={() => {
          const prevStatus = solicitacao.status;
          handleUpdateProcedure();
          modals.close("startAnalysis");
          showPostTransitionNotification("startAnalysis", prevStatus);
        }}
      />

      <UpdateAuthorizationsModal
        isOpen={modals.isOpen("updateAuthorizations")}
        onClose={closeModal("updateAuthorizations")}
        solicitacao={solicitacao}
        onSuccess={() => {
          handleUpdateProcedure();
          modals.close("updateAuthorizations");
        }}
      />

      <EditDateOptionsModal
        isOpen={modals.isOpen("editDateOptions")}
        onClose={closeModal("editDateOptions")}
        solicitacao={solicitacao}
        onSuccess={() => {
          handleUpdateProcedure();
          modals.close("editDateOptions");
        }}
      />

      <DefineSurgeryDateModal
        isOpen={modals.isOpen("defineDate")}
        onClose={closeModal("defineDate")}
        solicitacao={solicitacao}
        onSuccess={() => {
          const prevStatus = solicitacao.status;
          handleUpdateProcedure();
          modals.close("defineDate");
          showPostTransitionNotification("confirmDate", prevStatus);
        }}
      />

      <RescheduleModal
        isOpen={modals.isOpen("reschedule")}
        onClose={closeModal("reschedule")}
        solicitacao={solicitacao}
        onSuccess={() => {
          handleUpdateProcedure();
          modals.close("reschedule");
        }}
      />

      <SurgeryStatusModal
        isOpen={modals.isOpen("surgeryStatus")}
        onClose={closeModal("surgeryStatus")}
        solicitacao={solicitacao}
        onSuccess={() => {
          handleUpdateProcedure();
          modals.close("surgeryStatus");
        }}
      />

      <InvoiceModal
        isOpen={modals.isOpen("invoice")}
        onClose={closeModal("invoice")}
        solicitacao={solicitacao}
        onSuccess={() => {
          handleUpdateProcedure();
          modals.close("invoice");
        }}
      />

      <ConfirmReceiptModal
        isOpen={modals.isOpen("confirmReceipt")}
        onClose={closeModal("confirmReceipt")}
        solicitacao={solicitacao}
        onSuccess={() => {
          handleUpdateProcedure();
          modals.close("confirmReceipt");
        }}
      />

      <CloseRequestModal
        isOpen={modals.isOpen("close")}
        onClose={closeModal("close")}
        surgeryRequestId={solicitacao.id}
        onSuccess={() => {
          handleUpdateProcedure();
          modals.close("close");
        }}
      />

      <ConsentTermWarningModal
        isOpen={modals.isOpen("consentWarning")}
        isLoading={isSavingDate}
        onClose={closeModal("consentWarning")}
        onConfirm={() => handleConfirmDate(true)}
        onAttach={() => modals.open("consentUpload")}
      />

      <DocumentUploadModal
        isOpen={modals.isOpen("consentUpload")}
        onClose={closeModal("consentUpload")}
        surgeryRequestId={solicitacao.id}
        documentTypes={CONSENT_TERM_DOCUMENT_TYPES}
        folder={DOCUMENT_FOLDERS.PRE_SURGERY}
        onSuccess={() => {
          modals.close("consentUpload");
          handleUpdateProcedure();
        }}
      />

    </PageContainer>
  );
}
