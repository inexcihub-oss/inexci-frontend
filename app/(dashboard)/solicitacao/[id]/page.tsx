"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  surgeryRequestService,
  STATUS_NUMBER_TO_STRING,
  Activity,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import {
  pendencyService,
  ValidationResult,
  CalculatedPendency,
} from "@/services/pendency.service";
import { DynamicPendencyList } from "@/components/pendencies";
import {
  EditablePriority,
  EditableManager,
  EditableDeadline,
  StatusBadge,
} from "@/components/surgery-request/EditableFields";
import { MedicalReportEditor } from "@/components/laudo/MedicalReportEditor";
import { SendRequestModal } from "@/components/surgery-request/SendRequestModal";
import { PrimaryActionButton } from "@/components/surgery-request/PrimaryActionButton";
import { StartAnalysisModal } from "@/components/surgery-request/modals/StartAnalysisModal";
import { UpdateAuthorizationsModal } from "@/components/surgery-request/modals/UpdateAuthorizationsModal";
import { EditDateOptionsModal } from "@/components/surgery-request/modals/EditDateOptionsModal";
import { RescheduleModal } from "@/components/surgery-request/modals/RescheduleModal";
import { SurgeryStatusModal } from "@/components/surgery-request/modals/SurgeryStatusModal";
import { InvoiceModal } from "@/components/surgery-request/modals/InvoiceModal";
import { ConfirmReceiptModal } from "@/components/surgery-request/modals/ConfirmReceiptModal";

import PageContainer from "@/components/PageContainer";
import { InformacoesGeraisTab } from "@/components/surgery-request/tabs/InformacoesGeraisTab";
import { CodigoTussTab } from "@/components/surgery-request/tabs/CodigoTussTab";
import { OpmeTab } from "@/components/surgery-request/tabs/OpmeTab";
import { PosCirurgicoTab } from "@/components/surgery-request/tabs/PosCirurgicoTab";
import { FaturamentoTab } from "@/components/surgery-request/tabs/FaturamentoTab";
import { CloseRequestModal } from "@/components/surgery-request/modals/CloseRequestModal";
import { NotificationConfirmModal } from "@/components/surgery-request/modals/NotificationConfirmModal";
import { getPendencyAction } from "@/lib/pendency-navigation";
import { PriorityLevel } from "@/types/surgery-request.types";

type TabType =
  | "informacoes-gerais"
  | "codigo-tuss"
  | "opme"
  | "laudo"
  | "pos-cirurgico"
  | "faturamento";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitialsFromName(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/** Converte um caminho relativo da API em URL absoluta */
function getApiFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}/${path.replace(/^\//, "")}`;
}

function formatActivityDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffH < 24) return `há ${diffH}h`;
  if (diffD === 1) return "ontem";
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

// ── Avatar com fallback para iniciais ────────────────────────────────────────
function AvatarOrInitials({
  user,
  size = 28,
}: {
  user: { name: string; avatar_url?: string | null };
  size?: number;
}) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!user.avatar_url) return;
    // Se já for URL absoluta, usa direto; senão busca signed URL
    if (
      user.avatar_url.startsWith("http://") ||
      user.avatar_url.startsWith("https://")
    ) {
      setResolvedUrl(user.avatar_url);
      return;
    }
    import("@/services/upload.service")
      .then(({ uploadService }) =>
        uploadService.getSignedUrl(user.avatar_url as string),
      )
      .then((url) => setResolvedUrl(url))
      .catch(() => setImgError(true));
  }, [user.avatar_url]);

  if (resolvedUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedUrl}
        alt={user.name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitialsFromName(user.name)}
    </div>
  );
}

// ── Componente de Item de Atividade ───────────────────────────────────────────
function ActivityItem({ activity }: { activity: Activity }) {
  const isComment = activity.type === "comment";
  const isStatusChange = activity.type === "status_change";
  const isPdfGenerated = activity.type === "pdf_generated";

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-neutral-100 last:border-b-0">
      {/* Avatar / Ícone */}
      <div className="flex-shrink-0 mt-0.5">
        {isComment && activity.user ? (
          <AvatarOrInitials user={activity.user} size={28} />
        ) : (
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${isPdfGenerated ? "bg-red-50" : "bg-gray-100"}`}
          >
            {isStatusChange ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="#6b7280"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : isPdfGenerated ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 2V8H20M9 13H15M9 17H12"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="#6b7280"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-xs font-medium text-gray-800 truncate">
            {activity.user?.name ?? "Sistema"}
          </span>
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {formatActivityDate(activity.created_at)}
          </span>
        </div>
        {isPdfGenerated && activity.pdf_url ? (
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-gray-600 leading-snug">
              {activity.content}
            </p>
            <a
              href={getApiFileUrl(activity.pdf_url) ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium underline underline-offset-2 flex-shrink-0"
            >
              Ver PDF
            </a>
          </div>
        ) : (
          <p className="text-xs text-gray-600 leading-snug break-words">
            {activity.content}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Status Timeline Component ─────────────────────────────────────────────
const ALL_STATUSES: { num: number; label: string }[] = [
  { num: 1, label: "Pendente" },
  { num: 2, label: "Enviada" },
  { num: 3, label: "Em Análise" },
  { num: 4, label: "Em Agendamento" },
  { num: 5, label: "Agendada" },
  { num: 6, label: "Realizada" },
  { num: 7, label: "Faturada" },
  { num: 8, label: "Finalizada" },
  { num: 9, label: "Encerrada" },
];

function StatusTimeline({
  currentStatus,
  createdAt,
  activities,
}: {
  currentStatus: number;
  createdAt: string;
  activities: Activity[];
}) {
  // Build a map of status transitions from activities
  const statusDates = new Map<number, string>();
  statusDates.set(1, createdAt); // Status 1 = created_at

  activities
    .filter((a) => a.type === "status_change")
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    .forEach((a) => {
      // Try to extract status from content like "Status alterado para Enviada"
      const match = a.content.match(/para\s+"?([^"]+)"?\s*$/i);
      if (match) {
        const label = match[1].trim();
        const found = ALL_STATUSES.find((s) => s.label === label);
        if (found && !statusDates.has(found.num)) {
          statusDates.set(found.num, a.created_at);
        }
      }
    });

  const now = new Date();
  const createdDate = new Date(createdAt);
  const totalDays = Math.max(
    1,
    Math.ceil((now.getTime() - createdDate.getTime()) / 86400000),
  );

  const isEncerrada = currentStatus === 9;
  const isFinalizada = currentStatus === 8;

  // For Encerrada: only show statuses actually visited (in statusDates) + Encerrada itself
  // For others: show all statuses up to and including current (excluding Encerrada)
  const visibleStatuses = isEncerrada
    ? ALL_STATUSES.filter((s) => statusDates.has(s.num) || s.num === 9)
    : ALL_STATUSES.filter((s) => s.num !== 9);

  // Calculate days in each completed stage
  function getDaysInStage(statusNum: number): number | null {
    const enteredAt = statusDates.get(statusNum);
    if (!enteredAt) return null;
    const nextStatus = ALL_STATUSES.find(
      (s) => s.num > statusNum && statusDates.has(s.num),
    );
    const exitDate = nextStatus
      ? new Date(statusDates.get(nextStatus.num)!)
      : statusNum === currentStatus
        ? now
        : null;
    if (!exitDate) return null;
    return Math.max(
      0,
      Math.floor(
        (exitDate.getTime() - new Date(enteredAt).getTime()) / 86400000,
      ),
    );
  }

  return (
    <div className="p-4">
      {/* Total time card */}
      <div
        className={`mb-5 rounded-xl px-4 py-3 flex items-center gap-3 ${
          isEncerrada ? "bg-red-50" : "bg-teal-50"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isEncerrada ? "bg-red-100" : "bg-teal-100"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke={isEncerrada ? "#dc2626" : "#0d9488"}
              strokeWidth="1.5"
            />
            <path
              d="M12 7V12L15 15"
              stroke={isEncerrada ? "#dc2626" : "#0d9488"}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <p
            className={`text-xs font-semibold ${isEncerrada ? "text-red-700" : "text-teal-700"}`}
          >
            Tempo total
          </p>
          <p
            className={`text-sm font-bold ${isEncerrada ? "text-red-900" : "text-teal-900"}`}
          >
            {totalDays === 1 ? "1 dia" : `${totalDays} dias`}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {visibleStatuses.map((s, idx) => {
          const isThisEncerrada = s.num === 9;
          // A status is "completed" (green) if it was visited and is not Encerrada
          const isCompleted =
            !isThisEncerrada && statusDates.has(s.num) && s.num < currentStatus;
          const isCurrent =
            !isEncerrada && !isFinalizada && s.num === currentStatus;
          const isFinalizedLast = isFinalizada && s.num === 8;
          const isFuture =
            !isEncerrada && !statusDates.has(s.num) && s.num > currentStatus;
          const isLast = idx === visibleStatuses.length - 1;
          const daysInStage = getDaysInStage(s.num);
          const enteredAt = statusDates.get(s.num);

          return (
            <div key={s.num} className="flex items-start gap-3 relative">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={`absolute left-[13px] top-[26px] w-0.5 h-[calc(100%-2px)] ${
                    isCompleted || isFinalizedLast
                      ? "bg-teal-500"
                      : isThisEncerrada
                        ? "bg-gray-200"
                        : "bg-gray-200"
                  }`}
                />
              )}

              {/* Circle indicator */}
              <div className="flex-shrink-0 z-10 mt-0.5">
                {isThisEncerrada ? (
                  <div className="w-[26px] h-[26px] rounded-full bg-red-500 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M18 6L6 18M6 6L18 18"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                ) : isCompleted || isFinalizedLast ? (
                  <div className="w-[26px] h-[26px] rounded-full bg-teal-500 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 13L9 17L19 7"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : isCurrent ? (
                  <div className="w-[26px] h-[26px] rounded-full bg-white border-[3px] border-teal-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                  </div>
                ) : (
                  <div className="w-[26px] h-[26px] rounded-full bg-white border-2 border-gray-200" />
                )}
              </div>

              {/* Content */}
              <div
                className={`pb-6 flex-1 min-w-0 ${isFuture ? "opacity-40" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isThisEncerrada
                        ? "text-red-600"
                        : isCurrent
                          ? "text-teal-700"
                          : isCompleted || isFinalizedLast
                            ? "text-gray-900"
                            : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                      Atual
                    </span>
                  )}
                  {isFinalizedLast && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Concluída
                    </span>
                  )}
                  {isThisEncerrada && (
                    <span className="text-[10px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      Encerrada
                    </span>
                  )}
                </div>
                {enteredAt && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(enteredAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {daysInStage !== null && (
                      <span className="ml-1.5 text-gray-500">
                        ·{" "}
                        {daysInStage === 0
                          ? "< 1 dia"
                          : daysInStage === 1
                            ? "1 dia"
                            : `${daysInStage} dias`}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SolicitacaoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("informacoes-gerais");

  // Carregar estado do localStorage ou usar valores padrão
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("solicitacao-sidebar-open");
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [isActivitiesExpanded, setIsActivitiesExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("solicitacao-activities-expanded");
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [sidebarTab, setSidebarTab] = useState<"pendencias" | "timeline">(
    "pendencias",
  );

  const [solicitacao, setSolicitacao] = useState<SurgeryRequestDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(),
  );

  // Estado para validação dinâmica de pendências
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loadingPendencies, setLoadingPendencies] = useState(false);

  // Estados dos modais de ação
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isStartAnalysisModalOpen, setIsStartAnalysisModalOpen] =
    useState(false);
  const [isUpdateAuthorizationsModalOpen, setIsUpdateAuthorizationsModalOpen] =
    useState(false);
  const [pendingDateIndex, setPendingDateIndex] = useState<number | null>(null);
  const [isSavingDate, setIsSavingDate] = useState(false);
  const [isEditDateOptionsModalOpen, setIsEditDateOptionsModalOpen] =
    useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isSurgeryStatusModalOpen, setIsSurgeryStatusModalOpen] =
    useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isConfirmReceiptModalOpen, setIsConfirmReceiptModalOpen] =
    useState(false);
  const [isCloseRequestModalOpen, setIsCloseRequestModalOpen] = useState(false);

  // Estados do modal de confirmação de notificação ao paciente
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notifyPatient, setNotifyPatient] = useState(false);

  // Estados de atividades
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const activitiesEndRef = useRef<HTMLDivElement>(null);
  const [highlightedPendency, setHighlightedPendency] =
    useState<CalculatedPendency | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Salvar estado da sidebar no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "solicitacao-sidebar-open",
        JSON.stringify(isSidebarOpen),
      );
    }
  }, [isSidebarOpen]);

  // Fechar sidebar no mobile por padrão
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Salvar estado das atividades no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "solicitacao-activities-expanded",
        JSON.stringify(isActivitiesExpanded),
      );
    }
  }, [isActivitiesExpanded]);

  // Carregar validação de pendências (dinâmica - baseada nos dados atuais)
  const fetchPendencies = useCallback(async () => {
    if (!params.id) return;

    setLoadingPendencies(true);
    try {
      const validationData = await pendencyService.validate(
        params.id as string,
      );
      setValidation(validationData);
    } catch {
      // silently ignore
    } finally {
      setLoadingPendencies(false);
    }
  }, [params.id]);

  useEffect(() => {
    const fetchSolicitacao = async () => {
      try {
        setLoading(true);
        const data = await surgeryRequestService.getById(params.id as string);
        setSolicitacao(data);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchSolicitacao();
    }
  }, [params.id]);

  // Carregar pendências quando a solicitação mudar
  useEffect(() => {
    if (params.id) {
      fetchPendencies();
    }
  }, [params.id, fetchPendencies]);

  // ── Atividades ──────────────────────────────────────────────────────────────
  const fetchActivities = useCallback(async () => {
    if (!params.id) return;
    setLoadingActivities(true);
    try {
      const data = await surgeryRequestService.getActivities(
        params.id as string,
      );
      setActivities(data);
    } catch {
      // silently ignore
    } finally {
      setLoadingActivities(false);
    }
  }, [params.id]);

  const handleUpdateProcedure = useCallback(async () => {
    // Recarregar os dados da solicitação após a atualização
    try {
      const data = await surgeryRequestService.getById(params.id as string);
      setSolicitacao(data);
      // Também recarregar pendências e atividades, pois podem ter mudado
      fetchPendencies();
      fetchActivities();
    } catch {
      // silently ignore
    }
  }, [params.id, fetchPendencies, fetchActivities]);

  useEffect(() => {
    if (params.id) {
      fetchActivities();
    }
  }, [params.id, fetchActivities]);

  // Rolar para o fim quando novas atividades chegam
  useEffect(() => {
    if (isActivitiesExpanded && activities.length > 0) {
      activitiesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activities, isActivitiesExpanded]);

  const handleSendComment = async () => {
    const text = newComment.trim();
    if (!text || sendingComment || !params.id) return;
    setSendingComment(true);
    try {
      const created = await surgeryRequestService.createActivity(
        params.id as string,
        text,
      );
      setActivities((prev) => [...prev, created]);
      setNewComment("");
    } catch {
      // silently ignore
    } finally {
      setSendingComment(false);
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  // Mapeamento: chave de pendência → aba
  const pendencyKeyToTab: Partial<Record<string, TabType>> = {
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

  const handlePendencyClick = (key: string) => {
    const targetTab = pendencyKeyToTab[key];
    if (!targetTab) return;

    // Mudar para a aba correta
    setActiveTab(targetTab);

    // Fechar sidebar no mobile
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }

    // Encontrar a pendência nos dados de validação
    const pendency = validation?.pendencies?.find((p) => p.key === key) ?? null;

    // Cancelar timer anterior e definir destaque
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedPendency(pendency);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedPendency(null);
    }, 5000);

    // Rolar para o elemento após a aba ser renderizada
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

  // Status antes de REALIZADA (6) — exibem modal de notificação
  const isPreRealizadaStatus = (status: number) => status < 6;

  // Intercepta ação para exibir modal de notificação (apenas pré-REALIZADA, exceto surgeryStatus)
  const interceptWithNotification = (action: string) => {
    const statusNum = solicitacao?.status ?? 0;
    if (isPreRealizadaStatus(statusNum) && action !== "surgeryStatus") {
      setPendingAction(action);
      setIsNotificationModalOpen(true);
    } else {
      openActionModal(action);
    }
  };

  // Abre o modal da ação correspondente
  const openActionModal = (action: string, shouldNotify?: boolean) => {
    switch (action) {
      case "send":
        setIsSendModalOpen(true);
        break;
      case "startAnalysis":
        setIsStartAnalysisModalOpen(true);
        break;
      case "updateAuthorizations":
        setIsUpdateAuthorizationsModalOpen(true);
        break;
      case "confirmDate":
        handleConfirmDate(shouldNotify);
        break;
      case "surgeryStatus":
        setIsSurgeryStatusModalOpen(true);
        break;
      case "invoice":
        setIsInvoiceModalOpen(true);
        break;
      case "confirmReceipt":
        setIsConfirmReceiptModalOpen(true);
        break;
    }
  };

  // Callback do modal de notificação
  const handleNotificationConfirm = (shouldNotify: boolean) => {
    setNotifyPatient(shouldNotify);
    setIsNotificationModalOpen(false);
    if (pendingAction) {
      openActionModal(pendingAction, shouldNotify);
      setPendingAction(null);
    }
  };

  const handleConfirmDate = async (notifyPatientValue?: boolean) => {
    if (pendingDateIndex === null) {
      return;
    }
    setIsSavingDate(true);
    const notify =
      notifyPatientValue !== undefined ? notifyPatientValue : notifyPatient;
    try {
      await surgeryRequestService.confirmDate(solicitacao!.id, {
        selected_date_index: pendingDateIndex as 0 | 1 | 2,
        notify_patient: notify,
      });
      setPendingDateIndex(null);
      setNotifyPatient(false);
      handleUpdateProcedure();
    } catch {
      // silently ignore
    } finally {
      setIsSavingDate(false);
    }
  };

  // Abrir modal automaticamente quando há query param "action" (vindo do Kanban)
  useEffect(() => {
    if (!solicitacao) return;

    const action = searchParams.get("action");
    if (!action) return;

    // Remover o query param da URL sem recarregar a página
    router.replace(`/solicitacao/${params.id}`, { scroll: false });

    switch (action) {
      case "send":
        setIsSendModalOpen(true);
        break;
      case "start-analysis":
        setIsStartAnalysisModalOpen(true);
        break;
      case "update-authorizations":
        setIsUpdateAuthorizationsModalOpen(true);
        break;
      case "surgery-status":
        setIsSurgeryStatusModalOpen(true);
        break;
      case "invoice":
        setIsInvoiceModalOpen(true);
        break;
      case "confirm-receipt":
        setIsConfirmReceiptModalOpen(true);
        break;
      case "close":
        setIsCloseRequestModalOpen(true);
        break;
      default:
        break;
    }
  }, [solicitacao, searchParams, router, params.id]);

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
          new Set(solicitacao.documents.map((doc: any) => doc.id)),
        );
      }
    }
  };

  if (loading || !solicitacao) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  // Função para verificar se uma aba tem pendências não concluídas
  const getTabWarning = (tabId: TabType): boolean => {
    if (!validation || !validation.pendencies) return false;

    // Mapear abas para as keys de pendências correspondentes
    const tabPendencyMap: Record<TabType, string[]> = {
      "informacoes-gerais": ["patient_data", "hospital_data"],
      "codigo-tuss": ["tuss_procedures"],
      opme: ["opme_items"],
      laudo: ["medical_report"],
      "pos-cirurgico": [],
      faturamento: ["confirm_receipt"],
    };

    const pendencyKeys = tabPendencyMap[tabId] || [];

    // Verificar se há pendências não concluídas para esta aba
    return validation.pendencies.some(
      (pendency) =>
        pendencyKeys.includes(pendency.key) &&
        !pendency.isComplete &&
        !pendency.isOptional,
    );
  };

  const statusNum: number = solicitacao?.status ?? 0;

  // Abas dinâmicas com base no status
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
    // Aba Pós Cirúrgico: disponível a partir do status 6 (Realizada)
    ...(statusNum >= 6
      ? [
          {
            id: "pos-cirurgico" as TabType,
            label: "Pós Cirúrgico",
            hasWarning: false,
          },
        ]
      : []),
    // Aba Faturamento: disponível a partir do status 7 (Faturada)
    ...(statusNum >= 7
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
    <PageContainer>
      {/* Container com borda englobando tudo */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between px-4 lg:px-6 py-0 border-b border-neutral-100 h-13">
            <div className="flex items-center gap-2">
              <button
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
                {/* Progresso removido conforme solicitação */}
              </div>
            </div>

            {/* Menu de ações */}
            <div className="flex items-center gap-2">
              {/* Linha separadora */}
              <div className="w-px h-6 bg-gray-200"></div>

              {/* Toggle Sidebar */}
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none pb-2.5">
            <div className="px-4 lg:px-6 pt-4 pb-4 space-y-4">
              {/* Patient Card */}
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

                {/* Ações contextuais — dependem do status */}
                <div className="w-full sm:w-auto flex-shrink-0">
                  {/* Botão primário dinâmico */}
                  <PrimaryActionButton
                    status={statusNum}
                    onSendRequest={() => interceptWithNotification("send")}
                    onStartAnalysis={() =>
                      interceptWithNotification("startAnalysis")
                    }
                    onUpdateAuthorizations={() =>
                      interceptWithNotification("updateAuthorizations")
                    }
                    onConfirmDate={() =>
                      interceptWithNotification("confirmDate")
                    }
                    onSurgeryStatus={() =>
                      interceptWithNotification("surgeryStatus")
                    }
                    onInvoice={() => setIsInvoiceModalOpen(true)}
                    onConfirmReceipt={() => setIsConfirmReceiptModalOpen(true)}
                  />
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 lg:gap-6">
                {/* Status */}
                <div className="flex flex-col gap-2">
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
                  <div>
                    <StatusBadge status={solicitacao.status} />
                  </div>
                </div>

                {/* Prioridade */}
                <div className="flex flex-col gap-2">
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
                  <div>
                    <EditablePriority
                      initialValue={solicitacao.priority as PriorityLevel}
                      surgeryRequestId={solicitacao.id}
                      onUpdate={handleUpdateProcedure}
                    />
                  </div>
                </div>

                {/* Médico */}
                <div className="flex flex-col gap-2">
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
                  <div className="flex items-center gap-2 h-7 px-3 rounded-md border border-gray-200 bg-white text-xs">
                    {solicitacao.doctor ? (
                      <>
                        <span className="w-5 h-5 flex-shrink-0 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
                          {solicitacao.doctor.name
                            .split(" ")
                            .slice(0, 2)
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                        <span className="flex-1 min-w-0 truncate text-left text-gray-700">
                          {solicitacao.doctor.name}
                        </span>
                      </>
                    ) : (
                      <span className="flex-1 min-w-0 truncate text-left text-gray-400">
                        —
                      </span>
                    )}
                  </div>
                </div>

                {/* Gestor */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 h-5">
                    <Image
                      src="/icons/person.svg"
                      alt="Gestor"
                      width={16}
                      height={16}
                      className="text-gray-600"
                    />
                    <span className="font-semibold text-gray-900 text-xs">
                      Gestor
                    </span>
                  </div>
                  <div>
                    <EditableManager
                      initialValue={
                        solicitacao.manager
                          ? {
                              id: solicitacao.manager.id,
                              name: solicitacao.manager.name,
                            }
                          : null
                      }
                      surgeryRequestId={solicitacao.id}
                      onUpdate={() => {
                        handleUpdateProcedure();
                      }}
                    />
                  </div>
                </div>

                {/* Prazo Final */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 h-5">
                    <Image
                      src="/icons/calendar.svg"
                      alt="Prazo final"
                      width={16}
                      height={16}
                      className="text-gray-600"
                    />
                    <span className="font-semibold text-gray-900 text-xs">
                      Prazo final
                    </span>
                  </div>
                  <div>
                    <EditableDeadline
                      initialValue={solicitacao.deadline}
                      surgeryRequestId={solicitacao.id}
                      onUpdate={handleUpdateProcedure}
                    />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center border-b border-neutral-100 -mx-4 lg:-mx-6 px-4 lg:px-6 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] -mb-px ${
                      activeTab === tab.id
                        ? "text-black border-b-[3px] border-teal-700"
                        : "text-gray-500 hover:text-black"
                    }`}
                  >
                    {tab.label}
                    {tab.hasWarning && (
                      <Image
                        src="/icons/warning.svg"
                        alt="Aviso"
                        width={20}
                        height={20}
                        className="text-red-500"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="pb-4">
                {/* Banner de alerta para pendência em destaque */}
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

                {activeTab === "informacoes-gerais" && (
                  <InformacoesGeraisTab
                    solicitacao={solicitacao}
                    selectedDocuments={selectedDocuments}
                    handleSelectDocument={handleSelectDocument}
                    handleSelectAllDocuments={handleSelectAllDocuments}
                    onUpdateProcedure={handleUpdateProcedure}
                    surgeryRequestId={solicitacao.id}
                    onDocumentsUploaded={handleUpdateProcedure}
                    statusNum={statusNum}
                    pendingDateIndex={pendingDateIndex}
                    onSelectDate={setPendingDateIndex}
                    onEditDateOptions={() =>
                      setIsEditDateOptionsModalOpen(true)
                    }
                    onReschedule={() => setIsRescheduleModalOpen(true)}
                  />
                )}
                {activeTab === "codigo-tuss" && (
                  <CodigoTussTab
                    solicitacao={solicitacao}
                    onUpdate={handleUpdateProcedure}
                    statusNum={statusNum}
                  />
                )}
                {activeTab === "opme" && (
                  <OpmeTab
                    solicitacao={solicitacao}
                    onUpdate={handleUpdateProcedure}
                    statusNum={statusNum}
                  />
                )}
                {activeTab === "laudo" && (
                  <MedicalReportEditor
                    solicitacao={solicitacao}
                    onUpdate={handleUpdateProcedure}
                  />
                )}
                {activeTab === "pos-cirurgico" && (
                  <PosCirurgicoTab
                    solicitacao={solicitacao}
                    onUpdate={handleUpdateProcedure}
                  />
                )}
                {activeTab === "faturamento" && (
                  <FaturamentoTab
                    solicitacao={solicitacao}
                    onUpdate={handleUpdateProcedure}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        {isSidebarOpen && (
          <>
            {/* Mobile backdrop */}
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[55] lg:hidden animate-fade-in"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-[60] max-h-[92vh] bg-white rounded-t-3xl flex flex-col lg:relative lg:inset-auto lg:z-auto lg:rounded-none lg:max-h-none lg:w-88 lg:border-l lg:border-neutral-100 animate-slide-up lg:animate-none">
              {/* Mobile drag handle */}
              <div className="flex justify-center pt-3 pb-1 lg:hidden">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              {/* Mobile close header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-100 lg:hidden">
                <span className="text-sm font-semibold text-gray-900">
                  Pendências
                </span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl active:scale-[0.95] transition-all"
                  aria-label="Fechar painel"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="#111111"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              {/* Sidebar Header - Tabs */}
              <div className="flex items-center border-b border-neutral-100 h-13">
                <button
                  onClick={() => setSidebarTab("pendencias")}
                  className={`flex-1 h-full text-sm font-semibold transition-colors relative ${
                    sidebarTab === "pendencias"
                      ? "text-teal-700"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Pendências
                  {sidebarTab === "pendencias" && (
                    <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-teal-600 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setSidebarTab("timeline")}
                  className={`flex-1 h-full text-sm font-semibold transition-colors relative ${
                    sidebarTab === "timeline"
                      ? "text-teal-700"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Timeline
                  {sidebarTab === "timeline" && (
                    <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-teal-600 rounded-full" />
                  )}
                </button>
              </div>

              {/* Sidebar Content */}
              {sidebarTab === "timeline" ? (
                <div className="flex-1 overflow-auto">
                  <StatusTimeline
                    currentStatus={solicitacao.status}
                    createdAt={solicitacao.created_at}
                    activities={activities}
                  />
                </div>
              ) : (
                <>
                  {/* Pendências Content */}
                  <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                    {/* Lista de Pendências - Validação Dinâmica */}
                    <div className="flex-1 overflow-auto p-3">
                      {loadingPendencies ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
                        </div>
                      ) : validation ? (
                        <DynamicPendencyList
                          pendencies={validation.pendencies}
                          statusLabel={validation.statusLabel}
                          canAdvance={validation.canAdvance}
                          completedCount={validation.completedCount}
                          pendingCount={validation.pendingCount}
                          totalCount={validation.totalCount}
                          currentStatus={validation.currentStatus}
                          compact
                          onPendencyClick={handlePendencyClick}
                        />
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          Nenhuma pendência encontrada
                        </div>
                      )}
                    </div>

                    {/* Seção Atividades - Collapsible com fundo que cobre o input */}
                    <div
                      className={`bg-white transition-all duration-200 flex flex-col ${isActivitiesExpanded ? "flex-1 min-h-0" : ""}`}
                    >
                      <button
                        onClick={() =>
                          setIsActivitiesExpanded(!isActivitiesExpanded)
                        }
                        className="w-full flex items-center justify-between px-4 py-4 border-t border-b border-neutral-100 hover:bg-gray-50 transition-colors bg-white flex-shrink-0"
                      >
                        <h3 className="font-semibold text-sm text-black leading-normal">
                          Atividades
                        </h3>
                        <svg
                          className={`w-4 h-4 transition-transform ${isActivitiesExpanded ? "" : "rotate-180"}`}
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M6 15L12 9L18 15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      {/* Timeline de Atividades */}
                      {isActivitiesExpanded && (
                        <div className="flex-1 overflow-y-auto min-h-0">
                          {loadingActivities ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-700" />
                            </div>
                          ) : activities.length === 0 ? (
                            <div className="px-4 py-8 text-center text-xs text-gray-400">
                              Nenhuma atividade registrada.
                              <br />
                              Adicione um comentário abaixo.
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              {activities.map((activity) => (
                                <ActivityItem
                                  key={activity.id}
                                  activity={activity}
                                />
                              ))}
                              <div ref={activitiesEndRef} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Campo de Comentário */}
                    {isActivitiesExpanded && (
                      <div className="bg-white py-2 px-4 border-t border-neutral-100 flex-shrink-0 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
                        <div className="flex items-center bg-white border border-neutral-100 gap-2 py-2.5 px-3.5 rounded-xl">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={handleCommentKeyDown}
                            placeholder="Escreva um comentário"
                            disabled={sendingComment}
                            className="flex-1 bg-transparent border-none outline-none text-xs text-gray-900 leading-snug disabled:opacity-50"
                          />
                          <button
                            onClick={handleSendComment}
                            disabled={!newComment.trim() || sendingComment}
                            className="w-6 h-6 flex-shrink-0 hover:opacity-70 transition-opacity disabled:opacity-30"
                          >
                            {sendingComment ? (
                              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Image
                                src="/icons/send.svg"
                                alt="Enviar"
                                width={24}
                                height={24}
                              />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal de confirmação de notificação ao paciente (pré-REALIZADA) */}
      {(() => {
        const ACTION_NEXT_STATUS: Record<string, string> = {
          send: "Enviada",
          startAnalysis: "Em Análise",
          updateAuthorizations: "Em Agendamento",
          confirmDate: "Agendada",
          surgeryStatus: "Realizada",
        };
        return (
          <NotificationConfirmModal
            isOpen={isNotificationModalOpen}
            onClose={() => {
              setIsNotificationModalOpen(false);
              setPendingAction(null);
            }}
            currentStatus={
              STATUS_NUMBER_TO_STRING[solicitacao.status] ??
              String(solicitacao.status)
            }
            newStatus={ACTION_NEXT_STATUS[pendingAction ?? ""] ?? ""}
            onConfirm={handleNotificationConfirm}
            patientEmail={solicitacao.patient?.email}
            patientPhone={solicitacao.patient?.phone}
          />
        );
      })()}

      {/* Modal de Envio de Solicitação */}
      <SendRequestModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        solicitacao={solicitacao}
        notifyPatient={notifyPatient}
        onSuccess={() => {
          setNotifyPatient(false);
          handleUpdateProcedure();
          setIsSendModalOpen(false);
        }}
      />

      {/* Modal Solicitação em Análise (status 2 → 3) */}
      <StartAnalysisModal
        isOpen={isStartAnalysisModalOpen}
        onClose={() => setIsStartAnalysisModalOpen(false)}
        surgeryRequestId={solicitacao.id}
        notifyPatient={notifyPatient}
        onSuccess={() => {
          setNotifyPatient(false);
          handleUpdateProcedure();
          setIsStartAnalysisModalOpen(false);
        }}
      />

      {/* Modal Atualizar Autorizações (status 3) */}
      <UpdateAuthorizationsModal
        isOpen={isUpdateAuthorizationsModalOpen}
        onClose={() => setIsUpdateAuthorizationsModalOpen(false)}
        solicitacao={solicitacao}
        notifyPatient={notifyPatient}
        onSuccess={() => {
          setNotifyPatient(false);
          handleUpdateProcedure();
          setIsUpdateAuthorizationsModalOpen(false);
        }}
        onClose2={() => setIsUpdateAuthorizationsModalOpen(false)}
      />

      {/* Modal Editar Datas (status 4, sem transição) */}
      <EditDateOptionsModal
        isOpen={isEditDateOptionsModalOpen}
        onClose={() => setIsEditDateOptionsModalOpen(false)}
        solicitacao={solicitacao}
        onSuccess={() => {
          handleUpdateProcedure();
          setIsEditDateOptionsModalOpen(false);
        }}
      />

      {/* Modal Reagendar (status 5, sem transição) */}
      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        solicitacao={solicitacao}
        onSuccess={() => {
          handleUpdateProcedure();
          setIsRescheduleModalOpen(false);
        }}
      />

      {/* Modal Status da Cirurgia (status 5 → 6/9/reagendada) */}
      <SurgeryStatusModal
        isOpen={isSurgeryStatusModalOpen}
        onClose={() => setIsSurgeryStatusModalOpen(false)}
        solicitacao={solicitacao}
        notifyPatient={notifyPatient}
        onSuccess={() => {
          setNotifyPatient(false);
          handleUpdateProcedure();
          setIsSurgeryStatusModalOpen(false);
        }}
      />

      {/* Modal Faturar Solicitação (status 6 → 7) */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        solicitacao={solicitacao}
        onSuccess={() => {
          handleUpdateProcedure();
          setIsInvoiceModalOpen(false);
        }}
      />

      {/* Modal Confirmar Recebimento (status 7 → 8) */}
      <ConfirmReceiptModal
        isOpen={isConfirmReceiptModalOpen}
        onClose={() => setIsConfirmReceiptModalOpen(false)}
        solicitacao={solicitacao}
        onSuccess={() => {
          handleUpdateProcedure();
          setIsConfirmReceiptModalOpen(false);
        }}
      />

      {/* Modal de Encerrar Solicitação */}
      <CloseRequestModal
        isOpen={isCloseRequestModalOpen}
        onClose={() => setIsCloseRequestModalOpen(false)}
        surgeryRequestId={solicitacao.id}
        onSuccess={() => {
          handleUpdateProcedure();
          setIsCloseRequestModalOpen(false);
        }}
      />
    </PageContainer>
  );
}
