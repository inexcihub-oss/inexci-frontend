"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { surgeryRequestService } from "@/services/surgery-request.service";
import {
  pendencyService,
  ValidationResult,
  CalculatedPendency,
} from "@/services/pendency.service";
import { Checkbox } from "@/components/ui";
import { DynamicPendencyList } from "@/components/pendencies";
import { useToast } from "@/hooks/useToast";
import PageContainer from "@/components/PageContainer";

type TabType = "informacoes-gerais" | "codigo-tuss" | "opme" | "laudo";
type SidebarTab = "chat" | "pendencias";

export default function SolicitacaoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("informacoes-gerais");
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>("chat");
  const [solicitacao, setSolicitacao] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(),
  );
  const [allSolicitacoes, setAllSolicitacoes] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  // Carregar todas as solicitações para navegação
  useEffect(() => {
    const fetchAllSolicitacoes = async () => {
      try {
        const response = await surgeryRequestService.getAll();
        if (response && response.records && Array.isArray(response.records)) {
          setAllSolicitacoes(response.records);
          // Encontrar o índice atual
          const index = response.records.findIndex(
            (s: any) => s.id === parseInt(params.id as string),
          );
          setCurrentIndex(index !== -1 ? index : 0);
        }
      } catch (error) {
        console.error("Erro ao buscar solicitações:", error);
      }
    };

    fetchAllSolicitacoes();
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

  const handlePrevious = () => {
    if (currentIndex > 0 && allSolicitacoes.length > 0) {
      const prevSolicitacao = allSolicitacoes[currentIndex - 1];
      router.push(`/solicitacao/${prevSolicitacao.id}`);
    }
  };

  const handleNext = () => {
    if (
      currentIndex < allSolicitacoes.length - 1 &&
      allSolicitacoes.length > 0
    ) {
      const nextSolicitacao = allSolicitacoes[currentIndex + 1];
      router.push(`/solicitacao/${nextSolicitacao.id}`);
    }
  };

  if (loading || !solicitacao) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  const tabs = [
    {
      id: "informacoes-gerais" as TabType,
      label: "Informações Gerais",
      hasWarning: true,
    },
    { id: "codigo-tuss" as TabType, label: "Código TUSS", hasWarning: true },
    { id: "opme" as TabType, label: "OPME", hasWarning: false },
    { id: "laudo" as TabType, label: "Laudo", hasWarning: false },
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
                onClick={() => router.push("/procedimentos-cirurgicos")}
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

            {/* Navegação e menu de três pontos */}
            <div className="flex items-center gap-2">
              {/* Navegação entre solicitações */}
              <div className="flex items-center gap-1">
                <div className="flex items-center justify-center h-10 px-3 text-xs text-gray-500">
                  <span className="font-medium">{currentIndex + 1}</span>
                  <span className="mx-1 opacity-50">/</span>
                  <span className="opacity-50">{allSolicitacoes.length}</span>
                </div>
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="w-6 h-6 flex items-center justify-center border border-[#DCDFE3] rounded shadow-sm hover:bg-gray-50 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 15L12 9L6 15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex >= allSolicitacoes.length - 1}
                  className="w-6 h-6 flex items-center justify-center border border-[#DCDFE3] rounded shadow-sm hover:bg-gray-50 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {/* Linha separadora */}
              <div className="w-px h-6 bg-gray-200"></div>

              {/* Menu de três pontos */}
              <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-50 transition-colors p-1">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <circle cx="17.5" cy="11.5" r="1" fill="currentColor" />
                  <circle cx="11.5" cy="11.5" r="1" fill="currentColor" />
                  <circle cx="5.5" cy="11.5" r="1" fill="currentColor" />
                </svg>
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
              <div className="grid grid-cols-4 gap-1.5 items-center">
                {/* Status */}
                <div className="p-2">
                  <div className="flex items-center gap-1">
                    <Image
                      src="/icons/view-kanban.svg"
                      alt="Status"
                      width={16}
                      height={16}
                      className="text-gray-600"
                    />
                    <span className="font-semibold text-gray-900 text-xs leading-none">
                      Status
                    </span>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center justify-center font-semibold px-3 py-1 text-xs leading-none rounded-full gap-1 ${
                        solicitacao.status === 1
                          ? "bg-orange-100 text-orange-800"
                          : solicitacao.status === 2
                            ? "bg-blue-100 text-blue-800"
                            : solicitacao.status === 3
                              ? "bg-yellow-100 text-yellow-800"
                              : solicitacao.status === 4
                                ? "bg-purple-100 text-purple-800"
                                : solicitacao.status === 5
                                  ? "bg-indigo-100 text-indigo-800"
                                  : solicitacao.status === 6
                                    ? "bg-teal-100 text-teal-800"
                                    : solicitacao.status === 7
                                      ? "bg-cyan-100 text-cyan-800"
                                      : solicitacao.status === 8
                                        ? "bg-pink-100 text-pink-800"
                                        : solicitacao.status === 9
                                          ? "bg-green-100 text-green-800"
                                          : solicitacao.status === 10
                                            ? "bg-red-100 text-red-800"
                                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {solicitacao.status === 1
                        ? "Pendente"
                        : solicitacao.status === 2
                          ? "Enviada"
                          : solicitacao.status === 3
                            ? "Em Análise"
                            : solicitacao.status === 4
                              ? "Em Reanálise"
                              : solicitacao.status === 5
                                ? "Aguardando Agendamento"
                                : solicitacao.status === 6
                                  ? "Agendada"
                                  : solicitacao.status === 7
                                    ? "A Faturar"
                                    : solicitacao.status === 8
                                      ? "Faturada"
                                      : solicitacao.status === 9
                                        ? "Concluída"
                                        : solicitacao.status === 10
                                          ? "Cancelada"
                                          : "Status desconhecido"}
                    </span>
                  </div>
                </div>

                {/* Prioridade */}
                <div className="p-2">
                  <div className="flex items-center gap-1">
                    <Image
                      src="/icons/flag.svg"
                      alt="Prioridade"
                      width={16}
                      height={16}
                      className="text-gray-600"
                    />
                    <span className="font-semibold text-gray-900 text-xs leading-none">
                      Prioridade
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center justify-center bg-yellow-50 font-semibold text-yellow-800 border border-neutral-100 px-3 py-1 text-xs leading-none rounded-full gap-2.5">
                      {solicitacao.priority || "Média"}
                    </span>
                  </div>
                </div>

                {/* Gestor */}
                <div className="p-2">
                  <div className="flex items-center gap-1">
                    <Image
                      src="/icons/person.svg"
                      alt="Gestor"
                      width={16}
                      height={16}
                      className="text-gray-600"
                    />
                    <span className="font-semibold text-gray-900 text-xs leading-none">
                      Gestor
                    </span>
                  </div>
                  <div className="flex items-center mt-2 gap-2 rounded">
                    <div className="w-6 h-6 overflow-hidden flex-shrink-0 border border-neutral-100 bg-gray-200 flex items-center justify-center rounded-full">
                      <span className="text-xs font-semibold text-gray-600">
                        {solicitacao.responsible?.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join("") || "??"}
                      </span>
                    </div>
                    <span className="text-gray-900 text-xs leading-snug">
                      {solicitacao.responsible?.name || "Sem gestor"}
                    </span>
                  </div>
                </div>

                {/* Prazo Final */}
                <div className="p-2">
                  <div className="flex items-center gap-1">
                    <Image
                      src="/icons/calendar.svg"
                      alt="Prazo final"
                      width={16}
                      height={16}
                      className="text-gray-600"
                    />
                    <span className="font-semibold text-gray-900 text-xs leading-none">
                      Prazo final
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-900 text-xs leading-snug">
                      {solicitacao.deadline
                        ? new Date(solicitacao.deadline).toLocaleDateString(
                            "pt-BR",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )
                        : "Sem prazo"}
                    </span>
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
        <div className="w-88 border-l border-neutral-100 flex flex-col">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-neutral-100 h-13 relative">
            <button
              onClick={() => setActiveSidebarTab("chat")}
              className={`flex-1 flex items-center justify-center px-3 py-4 text-sm font-semibold transition-colors relative ${
                activeSidebarTab === "chat"
                  ? "text-gray-900 border-b-[3px] border-teal-700"
                  : "text-gray-900 hover:bg-gray-50"
              }`}
            >
              Chat
            </button>
            {/* Decorativo removido */}
            <button
              onClick={() => setActiveSidebarTab("pendencias")}
              className={`flex-1 flex items-center justify-center px-3 py-4 text-sm font-semibold transition-colors ${
                activeSidebarTab === "pendencias"
                  ? "text-gray-900 border-b-[3px] border-teal-700"
                  : "text-gray-900 hover:bg-gray-50"
              }`}
            >
              Pendências
            </button>
          </div>

          {/* Sidebar Content */}
          {activeSidebarTab === "chat" ? (
            <>
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="flex-1 flex flex-col justify-center items-center p-4 relative z-10">
                  <div className="w-full max-w-xs space-y-8 text-center">
                    <Image
                      src="/brand/logo.png"
                      alt="Inexci"
                      width={134}
                      height={40}
                      className="mx-auto"
                    />
                    <p className="text-xs font-semibold text-gray-900">
                      Preencha as informações do paciente com IA
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Input */}
              <div className="p-2 pb-2.5 bg-white">
                <div className="bg-white border border-neutral-100 rounded-xl shadow-sm p-4 space-y-2">
                  <div className="min-h-15">
                    <input
                      type="text"
                      placeholder="Como podemos ajudar?"
                      className="w-full text-base text-gray-900 placeholder-gray-500 opacity-50 bg-transparent border-none outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <button className="flex items-center gap-1 px-2 py-2 hover:bg-gray-50 rounded-lg transition-colors border border-neutral-100 h-10">
                      <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-sm text-gray-900">Anexar</span>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-teal-700 opacity-50 flex items-center justify-center hover:opacity-70 transition-opacity">
                      <Image
                        src="/icons/send.svg"
                        alt="Enviar"
                        width={20}
                        height={20}
                        className="text-white"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Pendências Content */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
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

                {/* Seção Atividades */}
                <div className="flex items-center px-2 pr-2 pl-1 border-t border-b border-neutral-100">
                  <div className="py-4 px-3">
                    <h3 className="font-semibold text-sm text-black leading-normal">
                      Atividades
                    </h3>
                  </div>
                </div>

                {/* Timeline de Atividades */}
                <div className="flex-1 overflow-auto">
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
                            {solicitacao.status_updates[0].new_status}
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
              </div>

              {/* Campo de Comentário */}
              <div className="bg-white py-2 px-4">
                <div className="flex items-center bg-white border border-neutral-100 gap-2 py-2 px-3 rounded-lg">
                  <input
                    type="text"
                    placeholder="Escreva um comentário"
                    className="flex-1 bg-transparent border-none outline-none text-xs text-gray-900 leading-snug"
                  />
                  <button className="w-6 h-6 flex-shrink-0">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3.44 3.84L20.17 11.97L11.03 20.86L8.84 12.03L3.44 3.84Z"
                        fill="#111111"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
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
}

function InformacoesGeraisTab({
  solicitacao,
  selectedDocuments,
  handleSelectDocument,
  handleSelectAllDocuments,
}: InformacoesGeraisTabProps) {
  return (
    <div className="space-y-2.5">
      {/* Dados do procedimento */}
      <div className="border border-neutral-100 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 h-10 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-black">
            Dados do procedimento
          </h3>
          <button className="flex items-center justify-center font-semibold text-black bg-transparent border border-neutral-100 hover:bg-gray-50 transition-colors py-1.5 px-3 gap-3 rounded text-sm leading-normal">
            Editar
          </button>
        </div>
        <div className="p-3 grid grid-cols-2 gap-x-6 gap-y-3">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">Hospital</label>
            <input
              type="text"
              value={solicitacao.hospital?.name || ""}
              className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 opacity-50 bg-white border border-neutral-100 rounded-lg focus:outline-none"
              disabled
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">
              CID (Código Internacional de Doenças)
            </label>
            <input
              type="text"
              value={solicitacao.cid?.description || ""}
              placeholder="..."
              className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 opacity-50 bg-white border border-neutral-100 rounded-lg focus:outline-none"
              disabled
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">Convênio</label>
            <input
              type="text"
              value={solicitacao.health_plan?.name || ""}
              className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 opacity-50 bg-white border border-neutral-100 rounded-lg focus:outline-none"
              disabled
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">
              Matrícula do convênio
            </label>
            <input
              type="text"
              value={solicitacao.health_plan_registry || ""}
              placeholder="..."
              className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 opacity-50 bg-white border border-neutral-100 rounded-lg focus:outline-none"
              disabled
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">
              Plano do convênio
            </label>
            <input
              type="text"
              value={solicitacao.health_plan_type || ""}
              placeholder="..."
              className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 opacity-50 bg-white border border-neutral-100 rounded-lg focus:outline-none"
              disabled
            />
          </div>
        </div>
      </div>

      {/* Documentos */}
      <div className="border border-neutral-100 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 h-10 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-black">Documentos</h3>
          <button className="flex items-center justify-center font-semibold text-black bg-transparent border border-neutral-100 hover:bg-gray-50 transition-colors py-1.5 px-3 gap-3 rounded-lg text-sm leading-normal">
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
                    {doc.key || "Documento"}
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
