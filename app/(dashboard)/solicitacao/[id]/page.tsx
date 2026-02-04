"use client";

import { useState, useEffect, useCallback } from "react";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  surgeryRequestService,
  STATUS_NUMBER_TO_STRING,
} from "@/services/surgery-request.service";
import {
  pendencyService,
  ValidationResult,
  CalculatedPendency,
} from "@/services/pendency.service";
import { Checkbox } from "@/components/ui";
import { DynamicPendencyList } from "@/components/pendencies";
import { EditableProcedureData } from "@/components/surgery-request/EditableProcedureData";
import {
  EditablePriority,
  EditableManager,
  EditableDeadline,
  StatusBadge,
} from "@/components/surgery-request/EditableFields";
import { DocumentUploadModal } from "@/components/documents/DocumentUploadModal";
import { useToast } from "@/hooks/useToast";
import PageContainer from "@/components/PageContainer";

type TabType = "informacoes-gerais" | "codigo-tuss" | "opme" | "laudo";
type SidebarTab = "chat" | "pendencias";

export default function SolicitacaoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("informacoes-gerais");
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>("chat");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isActivitiesExpanded, setIsActivitiesExpanded] = useState(true);
  const [solicitacao, setSolicitacao] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(),
  );

  // Estado para validação dinâmica de pendências
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loadingPendencies, setLoadingPendencies] = useState(false);
  const { showToast } = useToast();

  // Carregar validação de pendências (dinâmica - baseada nos dados atuais)
  const fetchPendencies = useCallback(async () => {
    if (!params.id) return;

    setLoadingPendencies(true);
    try {
      const validationData = await pendencyService.validate(
        params.id as string,
      );
      setValidation(validationData);
    } catch (error) {
      console.error("Erro ao validar pendências:", error);
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
      } catch (error) {
        console.error("Erro ao buscar solicitação:", error);
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
    } catch (error) {
      console.error("Erro ao recarregar solicitação:", error);
    }
  }, [params.id, fetchPendencies]);

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
      "informacoes-gerais": [
        "patient_data",
        "health_plan_data",
        "hospital_data",
        "diagnosis_data",
        "document_personal_document",
        "document_doctor_request",
      ],
      "codigo-tuss": ["insert_tuss"],
      opme: ["insert_opme"],
      laudo: ["medical_report"],
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
          <div className="flex-1 overflow-auto pb-2.5">
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
                <button className="bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors flex-shrink-0 flex items-center justify-center px-6 py-2.5 gap-3 rounded-lg leading-normal">
                  Enviar Solicitação
                </button>
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
                  />
                )}
                {activeTab === "codigo-tuss" && (
                  <CodigoTussTab solicitacao={solicitacao} />
                )}
                {activeTab === "opme" && <OpmeTab solicitacao={solicitacao} />}
                {activeTab === "laudo" && (
                  <LaudoTab solicitacao={solicitacao} />
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
    </PageContainer>
  );
}

// Tab Components
interface InformacoesGeraisTabProps {
  solicitacao: any;
  selectedDocuments: Set<string>;
  handleSelectDocument: (docId: string) => void;
  handleSelectAllDocuments: () => void;
  onUpdateProcedure: () => void;
  surgeryRequestId: number;
  onDocumentsUploaded: () => void;
}

function InformacoesGeraisTab({
  solicitacao,
  selectedDocuments,
  handleSelectDocument,
  handleSelectAllDocuments,
  onUpdateProcedure,
  surgeryRequestId,
  onDocumentsUploaded,
}: InformacoesGeraisTabProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);

  const handleAddDocuments = () => {
    setIsUploadModalOpen(true);
  };

  const handleUploadSuccess = () => {
    onDocumentsUploaded();
  };

  // Função para formatar o tipo de documento
  const formatDocumentType = (key: string): string => {
    const typeMap: Record<string, string> = {
      personal_document: "RG/CNH",
      doctor_request: "Pedido Médico",
      additional_document: "Outro Documento",
      rnm_report: "Laudo RNM",
      authorization_guide: "Guia de Autorização",
      invoice_protocol: "Protocolo de Fatura",
      contest_file: "Arquivo de Contestação",
    };
    return typeMap[key] || key || "Documento";
  };

  return (
    <div className="space-y-2.5">
      {/* Dados do procedimento */}
      <EditableProcedureData
        solicitacao={solicitacao}
        onUpdate={onUpdateProcedure}
      />

      {/* Documentos */}
      <div className="border border-neutral-100 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 h-10 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-black">Documentos</h3>
          <button
            onClick={handleAddDocuments}
            className="flex items-center justify-center font-semibold text-black bg-transparent border border-neutral-100 hover:bg-gray-50 transition-colors py-1.5 px-3 gap-3 rounded-lg text-sm leading-normal"
          >
            Adicionar
          </button>
        </div>
        <div className="space-y-0">
          {/* Header */}
          <div className="flex items-center gap-4 px-4 py-1.5 border-b border-neutral-100">
            <Checkbox
              checked={
                solicitacao.documents &&
                solicitacao.documents.length > 0 &&
                selectedDocuments.size === solicitacao.documents.length
              }
              onCheckedChange={handleSelectAllDocuments}
              indeterminate={
                selectedDocuments.size > 0 &&
                selectedDocuments.size < (solicitacao.documents?.length || 0)
              }
            />
            <div className="flex-1 text-xs text-gray-900 opacity-70">Tipo</div>
            <div className="flex-1 text-xs text-gray-900 opacity-70">
              Anexado em:
            </div>
            <div className="flex-1 text-xs text-gray-900 opacity-70">
              Tipo do arquivo:
            </div>
          </div>
          {/* Rows */}
          {solicitacao.documents && solicitacao.documents.length > 0 ? (
            solicitacao.documents.map((doc: any, index: number) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-4 py-2 hover:bg-gray-50 transition-colors"
                style={
                  index < solicitacao.documents.length - 1
                    ? { borderBottom: "1px solid #DCDFE3" }
                    : {}
                }
              >
                <Checkbox
                  checked={selectedDocuments.has(doc.id)}
                  onCheckedChange={() => handleSelectDocument(doc.id)}
                />
                <div className="flex-1 flex items-center gap-2">
                  <svg
                    className="w-6 h-6 text-gray-900"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 3V21H19V7.828L14.172 3H5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M8 9H11M8 13H16M8 17H13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <span className="text-xs font-semibold text-gray-900">
                    {doc.name}
                  </span>
                </div>
                <div className="flex-1 text-xs text-gray-900">
                  {new Date(doc.created_at).toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-xs text-gray-900">
                    {formatDocumentType(doc.key)}
                  </span>
                  <button className="w-6 h-6 flex items-center justify-center border border-neutral-100 rounded hover:bg-gray-100 transition-colors shadow-sm p-1">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                      <circle cx="17.5" cy="11.5" r="1" fill="currentColor" />
                      <circle cx="11.5" cy="11.5" r="1" fill="currentColor" />
                      <circle cx="5.5" cy="11.5" r="1" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              Nenhum documento anexado
            </div>
          )}
        </div>
      </div>

      {/* Modal de Upload de Documentos */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        surgeryRequestId={surgeryRequestId}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}

function CodigoTussTab({ solicitacao }: { solicitacao: any }) {
  return (
    <div className="flex-1 border border-neutral-100 rounded-lg overflow-hidden flex flex-col">
      {/* Header com Busca e Botão */}
      <div className="flex items-center justify-between gap-2.5 px-4 py-2.5 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          {/* Campo de Busca */}
          <div className="flex items-center gap-2 px-3 py-2 border border-neutral-100 rounded-lg bg-white w-80">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="#111111"
                strokeWidth="1.5"
              />
              <path
                d="M16 16L20 20"
                stroke="#111111"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Buscar procedimento"
              className="flex-1 bg-transparent border-none outline-none text-xs text-neutral-200 leading-snug"
            />
          </div>
        </div>

        {/* Botão Novo Procedimento */}
        <button className="flex items-center justify-center font-semibold text-black bg-transparent border border-neutral-100 hover:bg-gray-50 transition-colors rounded-lg py-1.5 px-3 gap-3 text-sm leading-normal">
          Novo Procedimento
        </button>
      </div>

      {/* Header da Tabela */}
      <div className="flex items-center gap-6 px-4 py-1 border-b border-neutral-100">
        <div className="w-6 h-6 opacity-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
              stroke="#111111"
              strokeWidth="1.5"
            />
          </svg>
        </div>
        <span className="flex-1 opacity-50 text-xs text-gray-900 leading-snug">
          Procedimento
        </span>
        <span className="opacity-50 text-xs text-gray-900 leading-snug">
          Quantidade
        </span>
        <div className="w-20" /> {/* Espaço para actions */}
      </div>

      {/* Linhas de Procedimentos */}
      <div className="flex-1 overflow-auto">
        {solicitacao.procedures && solicitacao.procedures.length > 0 ? (
          solicitacao.procedures.map((proc: any, index: number) => (
            <div
              key={proc.id}
              className="flex items-center gap-6 px-4 py-3 border-b border-neutral-100 hover:bg-gray-50 transition-colors"
            >
              {/* Checkbox */}
              <div className="w-6 h-6 opacity-50">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    stroke="#111111"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>

              {/* Procedimento */}
              <span className="flex-1 text-sm text-gray-900 leading-normal">
                {proc.procedure?.tuss_code || ""} - {proc.procedure?.name || ""}
              </span>

              {/* Quantidade */}
              <span className="flex-1 text-xs text-gray-900 leading-snug">
                {proc.quantity || "1"}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Botão Edit */}
                <button className="w-6 h-6 flex items-center justify-center bg-white rounded hover:bg-gray-100 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 19H19"
                      stroke="#111111"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M16 5L19 8L8 19H5V16L16 5Z"
                      stroke="#111111"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Botão Delete */}
                <button className="w-6 h-6 flex items-center justify-center bg-white rounded hover:bg-gray-100 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 6H17M10 3H14M7 6V18C7 19.1046 7.89543 20 9 20H15C16.1046 20 17 19.1046 17 18V6M10 11V16M14 11V16"
                      stroke="#E34935"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">
            Nenhum procedimento cadastrado
          </div>
        )}
      </div>
    </div>
  );
}

function OpmeTab({ solicitacao }: { solicitacao: any }) {
  const [expandedItems, setExpandedItems] = useState<{
    [key: number]: boolean;
  }>({});

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="flex-1 border border-neutral-100 rounded-lg overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2.5 px-4 py-2.5 border-b border-neutral-100">
        <div
          className="flex items-center gap-2 px-3 py-2 border border-neutral-100 rounded-lg bg-white"
          style={{ width: "340px" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#111111" strokeWidth="1.5" />
            <path
              d="M16 16L20 20"
              stroke="#111111"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Busque materiais e dispositivos"
            className="flex-1 bg-transparent border-none outline-none text-neutral-200 text-xs leading-snug"
          />
        </div>

        {/* Botão Editar OPME */}
        <button className="flex items-center justify-center font-semibold text-black bg-transparent border border-neutral-100 hover:bg-gray-50 transition-colors rounded-lg py-1.5 px-3 gap-3 text-sm leading-normal">
          Editar OPME
        </button>
      </div>

      {/* Header da Lista */}
      <div className="flex items-center gap-3 px-4 py-1 border-b border-neutral-100">
        <div className="w-6 h-6 opacity-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
              stroke="#111111"
              strokeWidth="1.5"
            />
          </svg>
        </div>
        <span className="flex-1 opacity-50 text-xs text-gray-900 leading-snug">
          Descrição
        </span>
        <div className="w-6 h-6 opacity-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="17.5" cy="11.5" r="1" fill="currentColor" />
            <circle cx="11.5" cy="11.5" r="1" fill="currentColor" />
            <circle cx="5.5" cy="11.5" r="1" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Lista de Materiais */}
      <div className="flex-1 overflow-auto">
        {solicitacao.opme_items && solicitacao.opme_items.length > 0 ? (
          solicitacao.opme_items.map((material: any, index: number) => (
            <div key={material.id}>
              {/* Header do Material */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 hover:bg-gray-50 transition-colors cursor-pointer">
                {/* Seta de Expansão */}
                <button
                  onClick={() => toggleItem(index)}
                  className={`w-6 h-6 flex items-center justify-center transition-transform ${
                    expandedItems[index] ? "rotate-90" : "rotate-0"
                  }`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M10 8L14 12L10 16"
                      stroke="#111111"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Nome do Material */}
                <span className="flex-1 font-semibold text-sm text-gray-900 leading-normal">
                  {material.name}
                </span>

                {/* Menu de Ações */}
                <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="17.5" cy="11.5" r="1" fill="currentColor" />
                    <circle cx="11.5" cy="11.5" r="1" fill="currentColor" />
                    <circle cx="5.5" cy="11.5" r="1" fill="currentColor" />
                  </svg>
                </button>
              </div>

              {/* Detalhes do Material (collapsible) */}
              {expandedItems[index] && (
                <div className="flex items-center gap-3 border-b border-neutral-100 bg-neutral-50 py-3 pr-4 pl-[52px]">
                  {/* Coluna Marca */}
                  <div className="flex-1 flex flex-col justify-center gap-1">
                    <span className="text-xs text-neutral-200 leading-snug">
                      Marca
                    </span>
                    <span className="text-xs text-gray-900 leading-snug">
                      {material.brand || "-"}
                    </span>
                  </div>

                  {/* Coluna Distribuidor */}
                  <div className="flex-1 flex flex-col justify-center gap-1">
                    <span className="text-xs text-neutral-200 leading-snug">
                      Distribuidor
                    </span>
                    <span className="text-xs text-gray-900 leading-snug">
                      {material.distributor || "-"}
                    </span>
                  </div>

                  {/* Coluna Quantidade */}
                  <div className="flex-1 flex flex-col justify-center gap-1">
                    <span className="text-xs text-neutral-200 leading-snug">
                      Quantidade
                    </span>
                    <span className="text-xs text-gray-900 leading-snug">
                      {material.quantity || "-"}
                    </span>
                  </div>

                  {/* Botão Edit */}
                  <button className="w-6 h-6 flex items-center justify-center bg-white rounded hover:bg-gray-100 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 19H19"
                        stroke="#111111"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M16 5L19 8L8 19H5V16L16 5Z"
                        stroke="#111111"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">
            Nenhum material OPME cadastrado
          </div>
        )}
      </div>
    </div>
  );
}

function LaudoTab({ solicitacao }: { solicitacao: any }) {
  return (
    <div className="flex-1 flex flex-col gap-2.5 overflow-auto">
      {/* Banner de Aviso IA */}
      <div className="flex flex-col justify-center gap-2 px-4 py-3 rounded-3xl bg-purple-50">
        <p className="m-0">
          <span className="block font-sans font-semibold text-sm leading-6 text-purple-500">
            Laudo gerado por IA
          </span>
          <span className="block mt-1 font-sans font-normal text-sm leading-none text-purple-500">
            Este laudo foi criado automaticamente com base no procedimento e
            histórico. Revise e edite conforme necessário antes de aprovar.
          </span>
        </p>
      </div>

      {/* Container do Laudo */}
      <div className="flex-1 flex flex-col relative px-4 py-4 border border-neutral-100 rounded-3xl bg-white overflow-auto gap-2">
        {/* Texto do Laudo */}
        <div className="flex-1 overflow-auto font-sans font-normal text-sm leading-relaxed text-gray-900">
          <p className="mb-4">
            <strong className="font-semibold">IDENTIFICAÇÃO DO PACIENTE</strong>
            <br />
            Nome: Maria Silva Santos
            <br />
            CPF: 123.456.789-00
            <br />
            Data de Nascimento: 15/03/1968
            <br />
            Nº da Carteira: 000000
          </p>
          <p className="mb-4">
            <strong className="font-semibold">INDICAÇÃO CIRÚRGICA</strong>
            <br />
            Artroplastia Total de Quadril Direito
          </p>
          <p className="mb-0">
            <strong className="font-semibold">JUSTIFICATIVA TÉCNICA</strong>
            <br />
            Paciente apresenta quadro de coxartrose avançada em quadril direito,
            com dor intensa e limitação funcional progressiva. O tratamento
            conservador foi esgotado sem sucesso. A radiografia demonstra
            acentuada redução do espaço articular, esclerose subcondral e
            formação de osteófitos marginais. A ressonância magnética confirma
            degeneração condral difusa e áreas de edema ósseo. Considerando a
            idade da paciente, o grau de comprometimento articular e a
            refratariedade ao tratamento clínico, está indicada a artroplastia
            total de quadril para alívio da dor, restauração da função e melhora
            da qualidade de vida.
          </p>
        </div>

        {/* Badge Rascunho - Posicionamento Absoluto */}
        <div className="absolute top-3 right-4 flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-purple-50">
          <span className="font-medium text-sm leading-tight text-purple-100">
            Rascunho
          </span>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center justify-end gap-2">
        {/* Botão Editar Laudo */}
        <button className="flex items-center justify-center px-4 h-10 gap-1 rounded bg-transparent hover:bg-gray-50 transition-colors">
          <span className="font-normal text-sm leading-tight text-teal-700">
            Editar Laudo
          </span>
        </button>

        {/* Botão Aprovar Laudo */}
        <button className="flex items-center justify-center px-4 h-10 gap-1 bg-white border border-neutral-100 hover:bg-gray-50 transition-colors rounded-lg shadow-sm">
          <span className="font-semibold text-sm leading-tight text-teal-700">
            Aprovar Laudo
          </span>
        </button>
      </div>
    </div>
  );
}
