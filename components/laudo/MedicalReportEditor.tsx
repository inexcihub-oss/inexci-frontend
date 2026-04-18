"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSolicitacao } from "@/contexts/SolicitacaoContext";
import {
  surgeryRequestService,
  ReportSection,
} from "@/services/surgery-request.service";
import { documentService, DOCUMENT_FOLDERS } from "@/services/document.service";
import { useToast } from "@/hooks/useToast";
import { MedicalReportPreviewModal } from "@/components/laudo/MedicalReportPreviewModal";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import api from "@/lib/api";
import { sanitizeHtml } from "@/lib/sanitize-html";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface PatientFormData {
  name: string;
  birthDate: string;
  rg: string;
  cpf: string;
  phone: string;
  address: string;
  zipCode: string;
  healthPlan: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateBR(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

function parseMedicalReport(sol: any): any {
  if (!sol?.medical_report) return {};
  try {
    return JSON.parse(sol.medical_report);
  } catch {
    return {};
  }
}

function buildPatientData(sol: any, parsed: any): PatientFormData {
  const pd = parsed?.patientData;
  const p = sol?.patient;
  return {
    name: pd?.name ?? p?.name ?? "",
    birthDate: pd?.birthDate ?? formatDateBR(p?.birth_date) ?? "",
    rg: pd?.rg ?? p?.rg ?? "",
    cpf: pd?.cpf ?? p?.cpf ?? "",
    phone: pd?.phone ?? p?.phone ?? "",
    address: pd?.address ?? p?.address ?? "",
    zipCode: pd?.zipCode ?? p?.zip_code ?? p?.cep ?? "",
    healthPlan:
      pd?.healthPlan ?? sol?.health_plan?.name ?? sol?.health_plan_name ?? "",
  };
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// Máscaras de exibição (somente formatam para mostrar ao usuário)
function applyCpfMask(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function applyPhoneMask(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

function applyCepMask(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}

// ─── Upload helpers ──────────────────────────────────────────────────────────

interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({
  className = "w-4 h-4 text-gray-400",
}: {
  className?: string;
}) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function MedicalReportEditor() {
  const { solicitacao, statusNum, onUpdate } = useSolicitacao();
  const { user: currentUser } = useAuth();

  // Laudo é editável apenas no status Pendente (1)
  const isReadOnly = statusNum > 1;
  const router = useRouter();

  // ── Estado do formulário ─────────────────────────────────────────────────
  const [patientData, setPatientData] = useState<PatientFormData>({
    name: "",
    birthDate: "",
    rg: "",
    cpf: "",
    phone: "",
    address: "",
    zipCode: "",
    healthPlan: "",
  });

  // ── Seções dinâmicas do laudo ────────────────────────────────────────────
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  // Estado local de edição: { [sectionId]: { title, description } }
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState<{
    title: string;
    description: string;
  }>({ title: "", description: "" });
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionDraft, setNewSectionDraft] = useState({
    title: "",
    description: "",
  });
  const [deletingSection, setDeletingSection] = useState<string | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(
    null,
  );
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(
    null,
  );

  // ── Estado de UI ─────────────────────────────────────────────────────────
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isDeletingDocId, setIsDeletingDocId] = useState<string | null>(null);
  const [imageUploadItems, setImageUploadItems] = useState<UploadItem[]>([]);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  const imagesInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // ── Tooltip de info sobre a seção de imagens do laudo ─────────────────────
  const [showImagesInfoTooltip, setShowImagesInfoTooltip] = useState(false);
  const [imagesInfoTooltipPos, setImagesInfoTooltipPos] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const imagesInfoTooltipRef = useRef<HTMLDivElement>(null);
  const imagesInfoButtonRef = useRef<HTMLButtonElement>(null);

  // Fecha tooltip de imagens ao clicar fora
  useEffect(() => {
    if (!showImagesInfoTooltip) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        imagesInfoTooltipRef.current &&
        !imagesInfoTooltipRef.current.contains(e.target as Node) &&
        imagesInfoButtonRef.current &&
        !imagesInfoButtonRef.current.contains(e.target as Node)
      ) {
        setShowImagesInfoTooltip(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showImagesInfoTooltip]);

  // Fecha tooltip de imagens ao rolar
  useEffect(() => {
    if (!showImagesInfoTooltip) return;
    const close = () => setShowImagesInfoTooltip(false);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [showImagesInfoTooltip]);

  function openImagesInfoTooltip() {
    if (!imagesInfoButtonRef.current) return;
    const rect = imagesInfoButtonRef.current.getBoundingClientRect();
    setImagesInfoTooltipPos({ top: rect.bottom + 8, left: rect.left });
    setShowImagesInfoTooltip(true);
  }

  // ── Documentos por tipo ──────────────────────────────────────────────────
  const examImages =
    solicitacao?.documents?.filter((d: any) => d.key === "report_images") ?? [];

  // ── Inicialização ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!solicitacao) return;
    const parsed = parseMedicalReport(solicitacao);
    setPatientData(buildPatientData(solicitacao, parsed));
  }, [solicitacao]);

  // ── Carregar sections do servidor ────────────────────────────────────────
  useEffect(() => {
    if (!solicitacao?.id) return;
    setIsLoadingSections(true);
    surgeryRequestService
      .getSections(solicitacao.id)
      .then(setSections)
      .catch(() => {})
      .finally(() => setIsLoadingSections(false));
  }, [solicitacao?.id]);

  // ── Carrega assinatura do médico ─────────────────────────────────────────
  // Usa exclusivamente a assinatura do médico vinculado à solicitação.
  // O backend já converte o path para URL assinada em findOne().
  useEffect(() => {
    const doctor = solicitacao?.doctor;
    const url: string | null = doctor?.signature_url ?? null;
    setSignatureUrl(url);
  }, [solicitacao]);

  // ── Handlers de Seções ──────────────────────────────────────────────────

  const handleAddSection = useCallback(async () => {
    if (!stripHtmlTags(newSectionDraft.title)) {
      showToast("O título da seção é obrigatório", "error");
      return;
    }
    setIsSavingSection(true);
    try {
      const created = await surgeryRequestService.createSection(
        solicitacao.id,
        {
          title: newSectionDraft.title,
          description: newSectionDraft.description,
        },
      );
      setSections((prev) => [...prev, created]);
      setNewSectionDraft({ title: "", description: "" });
      setIsAddingSection(false);
      onUpdate();
    } catch {
      showToast("Erro ao criar seção", "error");
    } finally {
      setIsSavingSection(false);
    }
  }, [newSectionDraft, solicitacao?.id, onUpdate, showToast]);

  const handleStartEditSection = useCallback((section: ReportSection) => {
    setEditingSection(section.id);
    setSectionDraft({
      title: section.title,
      description: section.description ?? "",
    });
  }, []);

  const handleSaveSection = useCallback(async () => {
    if (!editingSection) return;
    if (!stripHtmlTags(sectionDraft.title)) {
      showToast("O título da seção é obrigatório", "error");
      return;
    }
    setIsSavingSection(true);
    try {
      const updated = await surgeryRequestService.updateSection(
        solicitacao.id,
        editingSection,
        { title: sectionDraft.title, description: sectionDraft.description },
      );
      setSections((prev) =>
        prev.map((s) => (s.id === editingSection ? updated : s)),
      );
      setEditingSection(null);
      onUpdate();
    } catch {
      showToast("Erro ao salvar seção", "error");
    } finally {
      setIsSavingSection(false);
    }
  }, [editingSection, sectionDraft, solicitacao?.id, onUpdate, showToast]);

  const handleCancelEditSection = useCallback(() => {
    setEditingSection(null);
  }, []);

  const handleDeleteSection = useCallback(
    async (sectionId: string) => {
      setDeletingSection(sectionId);
      try {
        await surgeryRequestService.deleteSection(solicitacao.id, sectionId);
        setSections((prev) => prev.filter((s) => s.id !== sectionId));
        onUpdate();
      } catch {
        showToast("Erro ao remover seção", "error");
      } finally {
        setDeletingSection(null);
      }
    },
    [solicitacao?.id, onUpdate, showToast],
  );

  const handleMoveSection = useCallback(
    async (sectionId: string, direction: "up" | "down") => {
      const idx = sections.findIndex((s) => s.id === sectionId);
      if (idx === -1) return;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= sections.length) return;

      const reordered = [...sections];
      [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
      setSections(reordered);

      try {
        await surgeryRequestService.reorderSections(
          solicitacao.id,
          reordered.map((s) => s.id),
        );
      } catch {
        showToast("Erro ao reordenar seções", "error");
      }
    },
    [sections, solicitacao?.id, showToast],
  );

  const handleDragDrop = useCallback(
    async (dragId: string, dropId: string) => {
      if (dragId === dropId) return;
      const dragIdx = sections.findIndex((s) => s.id === dragId);
      const dropIdx = sections.findIndex((s) => s.id === dropId);
      if (dragIdx === -1 || dropIdx === -1) return;

      const reordered = [...sections];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(dropIdx, 0, moved);
      setSections(reordered);

      try {
        await surgeryRequestService.reorderSections(
          solicitacao.id,
          reordered.map((s) => s.id),
        );
      } catch {
        showToast("Erro ao reordenar seções", "error");
      }
    },
    [sections, solicitacao?.id, showToast],
  );

  const handleUploadImages = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const allFiles = Array.from(e.target.files ?? []);
      if (!allFiles.length) return;

      const allowed = /\.(jpe?g|png)$/i;
      const files = allFiles.filter((f) => allowed.test(f.name));
      const rejected = allFiles.length - files.length;
      if (rejected > 0) {
        showToast(
          `${rejected} arquivo(s) ignorado(s): apenas JPG e PNG são aceitos`,
          "error",
        );
      }
      if (!files.length) {
        if (imagesInputRef.current) imagesInputRef.current.value = "";
        return;
      }
      setIsUploadingImages(true);
      const initialItems: UploadItem[] = files.map((f) => ({
        id: `img-${Date.now()}-${f.name}`,
        name: f.name,
        size: f.size,
        progress: 0,
      }));
      setImageUploadItems(initialItems);
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const itemId = initialItems[i].id;
          await documentService.upload({
            surgery_request_id: solicitacao.id,
            key: "report_images",
            name: file.name.replace(/\.[^.]+$/, ""),
            file,
            folder: DOCUMENT_FOLDERS.REPORT,
            onUploadProgress: (pct) =>
              setImageUploadItems((prev) =>
                prev.map((it) =>
                  it.id === itemId ? { ...it, progress: pct } : it,
                ),
              ),
          });
          setImageUploadItems((prev) =>
            prev.map((it) =>
              it.id === itemId ? { ...it, progress: 100 } : it,
            ),
          );
        }
        showToast(
          files.length > 1 ? "Arquivos enviados" : "Arquivo enviado",
          "success",
        );
        onUpdate();
      } catch {
        showToast("Erro ao enviar arquivos", "error");
      } finally {
        setIsUploadingImages(false);
        setImageUploadItems([]);
        if (imagesInputRef.current) imagesInputRef.current.value = "";
      }
    },
    [solicitacao?.id, onUpdate, showToast],
  );

  const handleDeleteDocument = useCallback(
    async (docId: string, key: string) => {
      setIsDeletingDocId(docId);
      try {
        await documentService.delete({
          id: docId,
          key,
          surgery_request_id: solicitacao.id,
        });
        showToast("Arquivo removido", "success");
        onUpdate();
      } catch {
        showToast("Erro ao remover arquivo", "error");
      } finally {
        setIsDeletingDocId(null);
      }
    },
    [solicitacao?.id, onUpdate, showToast],
  );

  const handleExportPdf = useCallback(async () => {
    setIsExportingPdf(true);
    try {
      const response = await api.get(
        `/surgery-requests/${solicitacao.id}/report-pdf`,
        { responseType: "arraybuffer" },
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laudo-${solicitacao?.protocol ?? solicitacao?.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      showToast("Erro ao exportar PDF", "error");
    } finally {
      setIsExportingPdf(false);
    }
  }, [solicitacao?.id, solicitacao?.protocol, showToast]);

  // ── Classes utilitárias ───────────────────────────────────────────────────

  const inputClass = (_editing: boolean) =>
    `ds-input bg-gray-50 text-gray-400 border-gray-100 cursor-default select-none`;

  const editarBtnClass =
    "flex-shrink-0 flex items-center px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-xl text-xs md:text-sm font-semibold text-black hover:bg-gray-50 transition-colors";

  // ── Progresso do Laudo ───────────────────────────────────────────────────
  const p = solicitacao?.patient;
  const patientComplete = !!(
    p?.name &&
    p?.birth_date &&
    p?.cpf &&
    p?.phone &&
    p?.address &&
    p?.zip_code
  );

  const progressSteps = [
    {
      key: "identification",
      label: "Identificação",
      complete: patientComplete,
      optional: false,
    },
    {
      key: "sections",
      label: "Seções do Laudo",
      complete: sections.length > 0,
      optional: false,
    },
    {
      key: "images",
      label: "Imagens a serem anexadas ao laudo",
      complete: examImages.length > 0,
      optional: true,
    },
    {
      key: "signed",
      label: "Assinatura do Médico",
      complete: !!signatureUrl,
      optional: false,
    },
  ];
  const requiredSteps = progressSteps.filter((s) => !s.optional);
  const completedCount = requiredSteps.filter((s) => s.complete).length;
  const totalRequired = requiredSteps.length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col gap-3 w-full py-4">
        {/* ─── Progresso do Laudo ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 w-full bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <p className="text-xs md:text-sm font-semibold text-gray-900">
              Progresso do Laudo
            </p>
            <span
              className={`text-xs md:text-sm font-bold ${
                completedCount === totalRequired
                  ? "text-teal-700"
                  : "text-gray-500"
              }`}
            >
              {completedCount}/{totalRequired} obrigatórios concluídos
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / totalRequired) * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {progressSteps.map((step) => (
              <div
                key={step.key}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                  step.complete
                    ? "bg-teal-50 text-teal-700 border-teal-200"
                    : step.optional
                      ? "bg-gray-50 text-gray-400 border-gray-100"
                      : "bg-gray-50 text-gray-500 border-gray-200"
                }`}
              >
                {step.complete ? (
                  <svg
                    className="w-3 h-3 flex-shrink-0"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      step.optional ? "bg-gray-200" : "bg-gray-300"
                    }`}
                  />
                )}
                {step.label}
                {step.optional && (
                  <span className="text-gray-400 font-normal">(opcional)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─── Cards do laudo ───────────────────────────────────────────────── */}
        <div
          className={`flex flex-col gap-3 w-full ${isReadOnly ? "opacity-70 pointer-events-none" : ""}`}
          style={isReadOnly ? { pointerEvents: "none" } : undefined}
        >
          {/* Nota: pointer-events é re-habilitado abaixo nos botões de ação */}
          {/* ── IDENTIFICAÇÃO DO PACIENTE ─────────────────────────────────── */}
          <div
            id="laudo-patient-identification"
            className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between w-full gap-4">
              <h3 className="ds-section-title leading-loose">
                IDENTIFICAÇÃO DO PACIENTE
              </h3>
              {/* Botão navega para a tela de detalhes do paciente */}
              {!isReadOnly && (
                <button
                  onClick={() =>
                    router.push(
                      `/pacientes/${solicitacao?.patient?.id}?returnUrl=${encodeURIComponent(`/solicitacao/${solicitacao?.id}?tab=laudo`)}`,
                    )
                  }
                  className={editarBtnClass}
                >
                  Editar
                </button>
              )}
            </div>

            {!patientComplete && !isReadOnly && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Campos obrigatórios incompletos. Clique em
                <strong className="mx-0">Editar</strong> para preencher os dados
                do paciente.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {/* Nome */}
              <div className="flex flex-col gap-1">
                <label className="ds-label mb-0">Nome do paciente</label>
                <div className={inputClass(false)}>
                  {p?.name || <span className="text-gray-300">—</span>}
                </div>
              </div>

              {/* Data de nascimento */}
              <div className="flex flex-col gap-1">
                <label className="ds-label mb-0">Data de nascimento</label>
                <div className={inputClass(false)}>
                  {p?.birth_date ? (
                    formatDateBR(p.birth_date)
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </div>
              </div>

              {/* CPF */}
              <div className="flex flex-col gap-1">
                <label className="ds-label mb-0">CPF</label>
                <div className={inputClass(false)}>
                  {p?.cpf ? (
                    applyCpfMask(p.cpf)
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </div>
              </div>

              {/* Telefone */}
              <div className="flex flex-col gap-1">
                <label className="ds-label mb-0">Telefone</label>
                <div className={inputClass(false)}>
                  {p?.phone ? (
                    applyPhoneMask(p.phone)
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </div>
              </div>

              {/* Endereço */}
              <div className="flex flex-col gap-1">
                <label className="ds-label mb-0">Endereço</label>
                <div className={inputClass(false)}>
                  {p?.address || <span className="text-gray-300">—</span>}
                </div>
              </div>

              {/* CEP */}
              <div className="flex flex-col gap-1">
                <label className="ds-label mb-0">CEP</label>
                <div className={inputClass(false)}>
                  {p?.zip_code ? (
                    applyCepMask(p.zip_code)
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── SEÇÕES DO LAUDO ────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between w-full gap-2">
              <h3 className="ds-section-title leading-tight flex-1 min-w-0">
                SEÇÕES DO LAUDO
              </h3>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setNewSectionDraft({ title: "", description: "" });
                    setIsAddingSection(true);
                  }}
                  disabled={isAddingSection}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 rounded-xl text-xs md:text-sm font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Seção
                </button>
              )}
            </div>

            {/* Aviso: sem seções */}
            {!isLoadingSections &&
              sections.length === 0 &&
              !isAddingSection &&
              !isReadOnly && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  É necessário ao menos uma seção no laudo para enviar a
                  solicitação.
                </div>
              )}

            {/* Loading */}
            {isLoadingSections && (
              <div className="flex justify-center py-4">
                <Spinner className="w-5 h-5 text-gray-400" />
              </div>
            )}

            {/* Lista de seções */}
            {!isLoadingSections &&
              sections.map((section, idx) => (
                <div
                  key={section.id}
                  className="flex flex-col gap-3 border border-gray-200 rounded-xl p-3"
                >
                  {editingSection === section.id ? (
                    /* ── Modo edição ── */
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Título
                        </label>
                        <RichTextEditor
                          value={sectionDraft.title}
                          onChange={(html) =>
                            setSectionDraft((d) => ({
                              ...d,
                              title: html,
                            }))
                          }
                          placeholder="Título da seção"
                          minHeight="36px"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Corpo
                        </label>
                        <RichTextEditor
                          value={sectionDraft.description}
                          onChange={(html) =>
                            setSectionDraft((d) => ({
                              ...d,
                              description: html,
                            }))
                          }
                          placeholder="Descrição da seção..."
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={handleCancelEditSection}
                          disabled={isSavingSection}
                          className="flex items-center justify-center h-8 px-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSection}
                          disabled={isSavingSection}
                          className="flex items-center justify-center h-8 px-3 bg-teal-700 rounded-xl text-xs font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50"
                        >
                          {isSavingSection ? (
                            <span className="flex items-center gap-1.5">
                              <Spinner className="w-3.5 h-3.5 text-white" />
                              Salvando...
                            </span>
                          ) : (
                            "Salvar"
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* ── Modo visualização ── */
                    <div
                      className={`flex gap-2 transition-colors ${
                        dragOverSectionId === section.id &&
                        draggingSectionId !== section.id
                          ? "bg-teal-50 rounded-lg"
                          : ""
                      }`}
                      draggable
                      onDragStart={(e) => {
                        setDraggingSectionId(section.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOverSectionId(section.id);
                      }}
                      onDragLeave={() => setDragOverSectionId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverSectionId(null);
                        if (draggingSectionId) {
                          handleDragDrop(draggingSectionId, section.id);
                        }
                        setDraggingSectionId(null);
                      }}
                      onDragEnd={() => {
                        setDraggingSectionId(null);
                        setDragOverSectionId(null);
                      }}
                    >
                      {/* Controles de ordem */}
                      {!isReadOnly && (
                        <div className="flex flex-col items-center gap-0.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveSection(section.id, "up")}
                            disabled={idx === 0}
                            className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-30"
                            title="Mover para cima"
                          >
                            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <div className="cursor-grab active:cursor-grabbing p-0.5">
                            <GripVertical className="w-4 h-4 text-gray-300" />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleMoveSection(section.id, "down")
                            }
                            disabled={idx === sections.length - 1}
                            className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-30"
                            title="Mover para baixo"
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      )}

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div
                            className="font-semibold text-gray-900 break-words prose prose-sm max-w-none min-w-0"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(section.title),
                            }}
                          />
                          {!isReadOnly && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditSection(section)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                                title="Editar seção"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                >
                                  <path
                                    d="M11 2l3 3-9 9H2v-3l9-9z"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(section.id)}
                                disabled={deletingSection === section.id}
                                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500 disabled:opacity-50"
                                title="Remover seção"
                              >
                                {deletingSection === section.id ? (
                                  <Spinner className="w-3.5 h-3.5" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                        {section.description ? (
                          <div
                            className="text-xs text-gray-600 leading-relaxed prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(section.description),
                            }}
                          />
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Sem descrição
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

            {/* Formulário para nova seção */}
            {isAddingSection && !isReadOnly && (
              <div className="flex flex-col gap-3 border border-teal-200 bg-teal-50/40 rounded-xl p-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Título *
                  </label>
                  <RichTextEditor
                    value={newSectionDraft.title}
                    onChange={(html) =>
                      setNewSectionDraft((d) => ({ ...d, title: html }))
                    }
                    placeholder="Título da nova seção"
                    minHeight="36px"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Corpo
                  </label>
                  <RichTextEditor
                    value={newSectionDraft.description}
                    onChange={(html) =>
                      setNewSectionDraft((d) => ({ ...d, description: html }))
                    }
                    placeholder="Descrição da seção (opcional)..."
                  />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSection(false);
                      setNewSectionDraft({ title: "", description: "" });
                    }}
                    disabled={isSavingSection}
                    className="flex items-center justify-center h-8 px-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    disabled={
                      isSavingSection || !stripHtmlTags(newSectionDraft.title)
                    }
                    className="flex items-center justify-center gap-1.5 h-8 px-3 bg-teal-700 rounded-xl text-xs font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50"
                  >
                    {isSavingSection ? (
                      <span className="flex items-center gap-1.5">
                        <Spinner className="w-3.5 h-3.5 text-white" />
                        Salvando...
                      </span>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── IMAGENS A SEREM ANEXADAS AO LAUDO ───────────────────────────────────────── */}
          <div className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="ds-section-title leading-loose flex items-center gap-1.5">
              IMAGENS A SEREM ANEXADAS AO LAUDO
              <button
                ref={imagesInfoButtonRef}
                type="button"
                aria-label="Informações sobre as imagens do laudo"
                className="w-4 h-4 flex items-center justify-center text-teal-500 hover:text-teal-700 transition-colors focus:outline-none"
                onMouseEnter={openImagesInfoTooltip}
                onMouseLeave={(e) => {
                  const related = e.relatedTarget as Node | null;
                  if (
                    imagesInfoTooltipRef.current &&
                    related &&
                    imagesInfoTooltipRef.current.contains(related)
                  )
                    return;
                  setShowImagesInfoTooltip(false);
                }}
                onClick={() =>
                  showImagesInfoTooltip
                    ? setShowImagesInfoTooltip(false)
                    : openImagesInfoTooltip()
                }
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M12 11v5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="7.5" r="0.9" fill="currentColor" />
                </svg>
              </button>
              {showImagesInfoTooltip && typeof window !== "undefined" && (
                <div
                  ref={imagesInfoTooltipRef}
                  role="tooltip"
                  style={{
                    top: imagesInfoTooltipPos.top,
                    left: imagesInfoTooltipPos.left,
                  }}
                  className="fixed z-[9999] w-64 bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl leading-relaxed font-normal normal-case tracking-normal"
                  onMouseEnter={() => setShowImagesInfoTooltip(true)}
                  onMouseLeave={() => setShowImagesInfoTooltip(false)}
                >
                  <div
                    className="absolute -top-1.5 left-2 w-3 h-3 bg-gray-900 rotate-45 rounded-sm"
                    aria-hidden="true"
                  />
                  As imagens anexadas aqui serão exibidas no{" "}
                  <strong>meio do laudo</strong>, abaixo do histórico.
                </div>
              )}
            </h3>

            {/* Dropzone */}
            {!isReadOnly && (
              <>
                <input
                  ref={imagesInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleUploadImages}
                />
                <button
                  type="button"
                  onClick={() => imagesInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 w-full py-2 pl-4 pr-2 bg-gray-100 border border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  {isUploadingImages ? (
                    <Spinner className="w-8 h-8 text-gray-400" />
                  ) : (
                    <svg
                      className="w-8 h-8 text-gray-400"
                      viewBox="0 0 32 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.667 8H7.334C6.228 8 5.334 8.895 5.334 10v16c0 1.105.894 2 2 2h17.333c1.105 0 2-.895 2-2V10c0-1.105-.895-2-2-2h-3.333"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 4v16M12 8l4-4 4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  <span className="text-xs md:text-sm text-gray-500 text-center">
                    {isUploadingImages
                      ? "Enviando..."
                      : "Clique para anexar imagens do exame (Raio-X, Ressonâncias, etc)"}
                  </span>
                </button>
              </>
            )}

            {/* Arquivos enviados + em envio */}
            {(imageUploadItems.length > 0 || examImages.length > 0) && (
              <div className="flex flex-col gap-2">
                {/* Em envio */}
                {imageUploadItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-xl"
                  >
                    <span className="flex-1 text-xs md:text-sm font-semibold text-gray-900 truncate">
                      {item.name}{" "}
                      <span className="font-normal text-gray-400">
                        ({formatBytes(item.size)})
                      </span>
                    </span>
                    <div className="w-20 sm:w-32 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <div className="w-6 h-6 flex-shrink-0" />
                  </div>
                ))}
                {/* Já carregados */}
                {examImages.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-xl"
                  >
                    <a
                      href={doc.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-xs md:text-sm font-semibold text-gray-900 truncate hover:text-teal-700 hover:underline transition-colors"
                    >
                      {doc.name}
                    </a>
                    <div className="w-20 sm:w-32 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      <div className="h-full w-full bg-teal-600 rounded-full" />
                    </div>
                    {!isReadOnly && (
                      <button
                        onClick={() =>
                          handleDeleteDocument(doc.id, "report_images")
                        }
                        disabled={isDeletingDocId === doc.id}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                      >
                        {isDeletingDocId === doc.id ? (
                          <Spinner />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Assinatura do Médico ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="ds-section-title leading-loose">
              ASSINATURA DO MÉDICO
            </h3>

            {signatureUrl ? (
              <div className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signatureUrl}
                  alt="Assinatura do médico"
                  className="h-8 max-w-[120px] object-contain flex-shrink-0"
                />
                <span className="flex-1 text-xs md:text-sm font-semibold text-gray-900 truncate">
                  Assinatura
                </span>
                <div className="w-20 sm:w-32 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                  <div className="h-full w-full bg-teal-600 rounded-full" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full py-3 px-4 sm:pl-4 sm:pr-2 bg-gray-100 border border-dashed border-gray-200 rounded-xl">
                <p className="text-xs md:text-sm text-gray-500 leading-snug flex-1">
                  {isReadOnly
                    ? "Nenhuma assinatura registrada no momento da criação do laudo."
                    : solicitacao?.doctor &&
                        currentUser &&
                        solicitacao.doctor.id !== currentUser.id
                      ? `O médico ${solicitacao.doctor.name} ainda não possui assinatura cadastrada. Acesse o perfil dele para adicionar.`
                      : "Nenhuma assinatura configurada. Adicione sua assinatura nas configurações para incluí-la no laudo."}
                </p>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        solicitacao?.doctor &&
                        currentUser &&
                        solicitacao.doctor.id !== currentUser.id
                      ) {
                        router.push(
                          `/colaboradores/assistente/${solicitacao.doctor.id}`,
                        );
                      } else {
                        router.push("/configuracoes");
                      }
                    }}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-xl text-xs md:text-sm text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    Adicionar assinatura
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Divisor ─────────────────────────────────────────────────────── */}
        <hr className="border-gray-200" />

        {/* ─── Botões de ação ───────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-end gap-2 w-full flex-wrap"
          style={{ opacity: 1, pointerEvents: "auto" }}
        >
          {(() => {
            const canPreview = !!patientData.name.trim() && sections.length > 0;
            const canExport = canPreview;
            return (
              <>
                <button
                  onClick={() => setShowPreview(true)}
                  disabled={!canPreview}
                  className="flex items-center h-10 px-4 text-xs md:text-sm font-semibold text-teal-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  Pré-visualizar
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf || !canExport}
                  className="flex items-center h-10 px-4 bg-white border border-gray-200 shadow-sm text-xs md:text-sm font-semibold text-teal-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isExportingPdf ? "Exportando..." : "Exportar PDF"}
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {/* Modal de pré-visualização */}
      <MedicalReportPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        solicitacao={solicitacao}
      />
    </>
  );
}
