"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  surgeryRequestService,
  STATUS_NUMBER_TO_STRING,
} from "@/services/surgery-request.service";
import { pendencyService, ValidationResult } from "@/services/pendency.service";
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

type TabType =
  | "informacoes-gerais"
  | "codigo-tuss"
  | "opme"
  | "laudo"
  | "pos-cirurgico"
  | "faturamento";

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

  const [solicitacao, setSolicitacao] = useState<any>(null);
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

  // Salvar estado da sidebar no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "solicitacao-sidebar-open",
        JSON.stringify(isSidebarOpen),
      );
    }
  }, [isSidebarOpen]);

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

  const handleUpdateProcedure = useCallback(async () => {
    // Recarregar os dados da solicitação após a atualização
    try {
      const data = await surgeryRequestService.getById(params.id as string);
      setSolicitacao(data);
      // Também recarregar pendências, pois podem ter mudado
      fetchPendencies();
    } catch {
      // silently ignore
    }
  }, [params.id, fetchPendencies]);

  const handleConfirmDate = async () => {
    if (pendingDateIndex === null) {
      // sem data selecionada, ignora
      return;
    }
    setIsSavingDate(true);
    try {
      await surgeryRequestService.confirmDate(solicitacao!.id, {
        selected_date_index: pendingDateIndex as 0 | 1 | 2,
      });
      setPendingDateIndex(null);
      handleUpdateProcedure();
    } catch {
      // silently ignore (toast pode ser adicionado aqui se necessário)
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
      "informacoes-gerais": ["patient_data", "hospital_data", "documents"],
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
          <header className="flex items-center justify-between px-6 py-0 border-b border-neutral-100 h-13">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/solicitacoes-cirurgicas")}
                className="w-6 h-6 flex items-center justify-center border border-[#DCDFE3] rounded shadow-sm hover:bg-gray-50 transition-colors p-1"
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
              <div className="flex items-center">
                <div className="flex items-center justify-center px-2 py-4">
                  <span className="text-sm text-gray-900">Kanban</span>
                </div>
                <svg
                  className="w-6 h-6 text-gray-400"
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
                <div className="flex items-center gap-1 px-2 py-4">
                  <span className="text-sm font-semibold text-gray-900">
                    {solicitacao.patient?.name || "Sem nome"}
                  </span>
                  <span className="text-sm text-gray-900">
                    (
                    {solicitacao.procedures?.[0]?.procedure?.name ||
                      "Sem procedimento"}
                    )
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
                className={`w-6 h-6 flex items-center justify-center hover:bg-teal-50 transition-colors ${isSidebarOpen ? "border border-[#DCDFE3] rounded shadow-sm" : ""}`}
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
            <div className="px-6 pt-2.5 pb-2.5 space-y-2.5">
              {/* Patient Card */}
              <div
                className="bg-gradient-to-r from-white to-white rounded-lg p-2 flex items-center justify-between"
                style={{
                  backgroundImage:
                    "linear-gradient(162deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%), repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,0,0,0.03) 20px, rgba(0,0,0,0.03) 21px)",
                  backgroundSize: "100%, 20px 20px",
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center">
                    <span className="text-3xl font-semibold text-gray-600">
                      {solicitacao.patient?.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("") || "??"}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl text-gray-900 font-light leading-tight tracking-tight">
                      {solicitacao.patient?.name || "Sem nome"}
                    </h2>
                    <p className="text-sm text-gray-900 opacity-70 leading-normal">
                      {solicitacao.procedures?.[0]?.procedure?.name ||
                        "Sem procedimento"}
                    </p>
                  </div>
                </div>

                {/* Ações contextuais — dependem do status */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Botão primário dinâmico */}
                  <PrimaryActionButton
                    status={statusNum}
                    onSendRequest={() => setIsSendModalOpen(true)}
                    onStartAnalysis={() => setIsStartAnalysisModalOpen(true)}
                    onUpdateAuthorizations={() =>
                      setIsUpdateAuthorizationsModalOpen(true)
                    }
                    onConfirmDate={handleConfirmDate}
                    onSurgeryStatus={() => setIsSurgeryStatusModalOpen(true)}
                    onInvoice={() => setIsInvoiceModalOpen(true)}
                    onConfirmReceipt={() => setIsConfirmReceiptModalOpen(true)}
                  />
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-4 gap-6">
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
                      initialValue={solicitacao.priority}
                      surgeryRequestId={solicitacao.id}
                      onUpdate={handleUpdateProcedure}
                    />
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
              <div className="flex items-center border-b border-neutral-100 -mx-6 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 px-3 py-4 text-sm font-semibold transition-colors ${
                      activeTab === tab.id
                        ? "text-black border-b-[3px] border-teal-700"
                        : "text-black hover:bg-gray-50"
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
              <div className="pb-2.5">
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
          <div className="w-88 border-l border-neutral-100 flex flex-col">
            {/* Sidebar Header */}
            <div className="flex items-center justify-center border-b border-neutral-100 h-13">
              <h3 className="text-sm font-semibold text-gray-900">
                Pendências
              </h3>
            </div>

            {/* Sidebar Content - Pendências */}
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
                      compact
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma pendência encontrada
                    </div>
                  )}
                </div>

                {/* Seção Atividades - Collapsible com fundo que cobre o input */}
                <div
                  className={`bg-white transition-all duration-200 ${isActivitiesExpanded ? "flex-1" : ""}`}
                >
                  <button
                    onClick={() =>
                      setIsActivitiesExpanded(!isActivitiesExpanded)
                    }
                    className="w-full flex items-center justify-between px-4 py-4 border-t border-b border-neutral-100 hover:bg-gray-50 transition-colors bg-white"
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

                  {/* Timeline de Atividades - Expande para mostrar conteúdo */}
                  {isActivitiesExpanded && (
                    <div className="flex flex-col overflow-auto bg-white">
                      {/* Mostra o último status update se existir */}
                      {solicitacao.status_updates &&
                        solicitacao.status_updates.length > 0 && (
                          <div className="flex items-center justify-between border-b border-neutral-100 gap-1 py-3 pr-2 pl-4">
                            <div className="flex items-center flex-1 gap-2">
                              <div className="w-6 h-6 flex-shrink-0">
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <path
                                    d="M5 3V21H19V7.828L14.172 3H5Z"
                                    stroke="#111111"
                                    strokeWidth="1.5"
                                  />
                                  <path
                                    d="M8 9H11M8 13H16M8 17H13"
                                    stroke="#111111"
                                    strokeWidth="1.5"
                                  />
                                </svg>
                              </div>
                              <span className="text-xs text-gray-900 leading-snug">
                                Status alterado para{" "}
                                {STATUS_NUMBER_TO_STRING[
                                  solicitacao.status_updates[0].new_status
                                ] || solicitacao.status_updates[0].new_status}
                              </span>
                            </div>
                            <span className="text-xs text-gray-900 opacity-70 leading-snug">
                              {new Date(
                                solicitacao.status_updates[0].created_at,
                              ).toLocaleDateString("pt-BR", {
                                day: "numeric",
                                month: "short",
                              })}{" "}
                              às{" "}
                              {new Date(
                                solicitacao.status_updates[0].created_at,
                              ).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                      {/* Exibe mensagem se não houver atividades */}
                      {(!solicitacao.status_updates ||
                        solicitacao.status_updates.length === 0) && (
                        <div className="px-4 py-8 text-center text-gray-500">
                          Nenhuma atividade registrada
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Campo de Comentário - Sempre visível quando Atividades está expandido */}
                {isActivitiesExpanded && (
                  <div className="bg-white py-2 px-4 border-t border-neutral-100">
                    <div className="flex items-center bg-white border border-neutral-100 gap-2 py-2 px-3 rounded-lg">
                      <input
                        type="text"
                        placeholder="Escreva um comentário"
                        className="flex-1 bg-transparent border-none outline-none text-xs text-gray-900 leading-snug"
                      />
                      <button className="w-6 h-6 flex-shrink-0 hover:opacity-70 transition-opacity">
                        <Image
                          src="/icons/send.svg"
                          alt="Enviar"
                          width={24}
                          height={24}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          </div>
        )}
      </div>

      {/* Modal de Envio de Solicitação */}
      <SendRequestModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        solicitacao={solicitacao}
        onSuccess={() => {
          handleUpdateProcedure();
          setIsSendModalOpen(false);
        }}
      />

      {/* Modal Solicitação em Análise (status 2 → 3) */}
      <StartAnalysisModal
        isOpen={isStartAnalysisModalOpen}
        onClose={() => setIsStartAnalysisModalOpen(false)}
        surgeryRequestId={solicitacao.id}
        onSuccess={() => {
          handleUpdateProcedure();
          setIsStartAnalysisModalOpen(false);
        }}
      />

      {/* Modal Atualizar Autorizações (status 3) */}
      <UpdateAuthorizationsModal
        isOpen={isUpdateAuthorizationsModalOpen}
        onClose={() => setIsUpdateAuthorizationsModalOpen(false)}
        solicitacao={solicitacao}
        onSuccess={() => {
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
        onSuccess={() => {
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
