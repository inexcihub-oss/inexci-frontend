"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { documentService, DOCUMENT_FOLDERS } from "@/services/document.service";
import { useToast } from "@/hooks/useToast";
import { MedicalReportPreviewModal } from "@/components/laudo/MedicalReportPreviewModal";
import api from "@/lib/api";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface MedicalReportEditorProps {
  solicitacao: any;
  onUpdate: () => void;
}

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

export function MedicalReportEditor({
  solicitacao,
  onUpdate,
}: MedicalReportEditorProps) {
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
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [isEditingConduct, setIsEditingConduct] = useState(false);
  const [historyAndDiagnosis, setHistoryAndDiagnosis] = useState("");
  const [conduct, setConduct] = useState("");

  // ── Estado de UI ─────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploadingSignedReport, setIsUploadingSignedReport] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isDeletingDocId, setIsDeletingDocId] = useState<string | null>(null);
  const [imageUploadItems, setImageUploadItems] = useState<UploadItem[]>([]);
  const [signedUploadItem, setSignedUploadItem] = useState<UploadItem | null>(
    null,
  );

  const signedReportInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // ── Máscaras ──────────────────────────────────────────────────────────────
  const maskCpf = (v: string) =>
    v
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  const maskDate = (v: string) =>
    v
      .replace(/\D/g, "")
      .slice(0, 8)
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})(\d)/, "$1/$2");

  const maskPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 10)
      return d
        .replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
        .replace(/-$/, "");
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  };

  const maskCep = (v: string) =>
    v
      .replace(/\D/g, "")
      .slice(0, 8)
      .replace(/(\d{5})(\d)/, "$1-$2");

  // ── Documentos por tipo ──────────────────────────────────────────────────
  const examImages =
    solicitacao?.documents?.filter((d: any) => d.key === "exam_images") ?? [];
  const signedReports =
    solicitacao?.documents?.filter((d: any) => d.key === "signed_report") ?? [];

  // ── Inicialização ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!solicitacao) return;
    const parsed = parseMedicalReport(solicitacao);
    setPatientData(buildPatientData(solicitacao, parsed));
    setHistoryAndDiagnosis(
      parsed.historyAndDiagnosis ?? parsed.surgicalIndication ?? "",
    );
    setConduct(parsed.conduct ?? parsed.technicalJustification ?? "");
  }, [solicitacao]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const parsed = parseMedicalReport(solicitacao);
      const p = solicitacao?.patient;
      const updatedReport = {
        ...parsed,
        historyAndDiagnosis,
        conduct,
        // Identificação sempre vem dos dados reais do paciente
        patientIdentification: [
          p?.name && `Nome: ${p.name}`,
          p?.birth_date && `Data de Nascimento: ${formatDateBR(p.birth_date)}`,
          p?.rg && `RG: ${p.rg}`,
          p?.cpf && `CPF: ${applyCpfMask(p.cpf)}`,
          p?.phone && `Telefone: ${applyPhoneMask(p.phone)}`,
          p?.address && `Endereço: ${p.address}`,
          (p?.zip_code ?? p?.cep) &&
            `CEP: ${applyCepMask(p?.zip_code ?? p?.cep ?? "")}`,
        ]
          .filter(Boolean)
          .join("\n"),
      };
      await surgeryRequestService.update(solicitacao.id, {
        medical_report: JSON.stringify(updatedReport),
      });
      showToast("Laudo salvo com sucesso", "success");
      setIsEditingHistory(false);
      setIsEditingConduct(false);
      onUpdate();
    } catch {
      showToast("Erro ao salvar laudo", "error");
    } finally {
      setIsSaving(false);
    }
  }, [historyAndDiagnosis, conduct, solicitacao, onUpdate, showToast]);

  const handleCancel = useCallback(() => {
    if (!solicitacao) return;
    const parsed = parseMedicalReport(solicitacao);
    setHistoryAndDiagnosis(
      parsed.historyAndDiagnosis ?? parsed.surgicalIndication ?? "",
    );
    setConduct(parsed.conduct ?? parsed.technicalJustification ?? "");
    setIsEditingHistory(false);
    setIsEditingConduct(false);
  }, [solicitacao]);

  const handleUploadSignedReport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploadingSignedReport(true);
      const item: UploadItem = {
        id: `signed-${Date.now()}`,
        name: file.name,
        size: file.size,
        progress: 0,
      };
      setSignedUploadItem(item);
      try {
        await documentService.upload({
          surgery_request_id: solicitacao.id,
          key: "signed_report",
          name: file.name.replace(/\.[^.]+$/, ""),
          file,
          folder: DOCUMENT_FOLDERS.PRE_SURGERY,
          onUploadProgress: (pct) =>
            setSignedUploadItem((prev) =>
              prev ? { ...prev, progress: pct } : prev,
            ),
        });
        showToast("Arquivo enviado", "success");
        onUpdate();
      } catch {
        showToast("Erro ao enviar arquivo", "error");
      } finally {
        setIsUploadingSignedReport(false);
        setSignedUploadItem(null);
        if (signedReportInputRef.current)
          signedReportInputRef.current.value = "";
      }
    },
    [solicitacao?.id, onUpdate, showToast],
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
            key: "exam_images",
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
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      showToast("Erro ao exportar PDF", "error");
    } finally {
      setIsExportingPdf(false);
    }
  }, [solicitacao?.id, solicitacao?.protocol, showToast]);

  // ── Classes utilitárias ───────────────────────────────────────────────────

  const inputClass = (editing: boolean) =>
    `w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors ${
      editing
        ? "bg-white text-gray-900 border-teal-600 focus:ring-2 focus:ring-teal-700 focus:border-teal-600"
        : "bg-gray-50 text-gray-400 border-gray-100 cursor-default select-none"
    }`;

  const textareaClass = (editing: boolean) =>
    `w-full h-40 px-3 py-2 text-sm border rounded-lg outline-none resize-none transition-colors ${
      editing
        ? "bg-white text-gray-900 border-teal-600 focus:ring-2 focus:ring-teal-700 focus:border-teal-600"
        : "bg-gray-50 text-gray-400 border-gray-100 cursor-default select-none"
    }`;

  const editarBtnClass =
    "flex-shrink-0 flex items-center px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-lg text-sm font-semibold text-black hover:bg-gray-50 transition-colors";

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
      key: "history",
      label: "Histórico e Diagnóstico",
      complete: !!historyAndDiagnosis.trim(),
      optional: false,
    },
    {
      key: "images",
      label: "Imagens do Exame",
      complete: examImages.length > 0,
      optional: true,
    },
    {
      key: "conduct",
      label: "Conduta",
      complete: !!conduct.trim(),
      optional: true,
    },
    {
      key: "signed",
      label: "Laudo Assinado",
      complete: signedReports.length > 0,
      optional: false,
    },
  ];
  const requiredSteps = progressSteps.filter((s) => !s.optional);
  const completedCount = requiredSteps.filter((s) => s.complete).length;
  const totalRequired = requiredSteps.length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col gap-4 w-full px-6 py-6">
        {/* ─── Progresso do Laudo ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 w-full bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">
              Progresso do Laudo
            </p>
            <span
              className={`text-sm font-bold ${
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
        <div className="flex flex-col gap-4 w-full">
          {/* ── IDENTIFICAÇÃO DO PACIENTE ─────────────────────────────────── */}
          <div className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-3xl p-4">
            <div className="flex items-center justify-between w-full gap-4">
              <h3 className="text-base font-bold text-black leading-loose">
                IDENTIFICAÇÃO DO PACIENTE
              </h3>
              {/* Botão navega para a tela de detalhes do paciente */}
              <button
                onClick={() =>
                  router.push(`/pacientes/${solicitacao?.patient?.id}`)
                }
                className={editarBtnClass}
              >
                Editar
              </button>
            </div>

            {!patientComplete && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
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

            <div className="grid grid-cols-2 gap-4 w-full">
              {/* Nome */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">
                  Nome do paciente
                </label>
                <div className={inputClass(false)}>
                  {p?.name || <span className="text-gray-300">—</span>}
                </div>
              </div>

              {/* Data de nascimento */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">
                  Data de nascimento
                </label>
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
                <label className="text-sm font-semibold text-black">CPF</label>
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
                <label className="text-sm font-semibold text-black">
                  Telefone
                </label>
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
                <label className="text-sm font-semibold text-black">
                  Endereço
                </label>
                <div className={inputClass(false)}>
                  {p?.address || <span className="text-gray-300">—</span>}
                </div>
              </div>

              {/* CEP */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">CEP</label>
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

          {/* ── HISTÓRICO E DIAGNÓSTICO ───────────────────────────────────── */}
          <div className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-3xl p-4">
            <div className="flex items-center justify-between w-full gap-4">
              <h3 className="text-base font-bold text-black leading-loose">
                HISTÓRICO E DIAGNÓSTICO
              </h3>
              {!isEditingHistory ? (
                <button
                  onClick={() => setIsEditingHistory(true)}
                  className={editarBtnClass}
                >
                  Editar
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-shrink-0 flex items-center justify-center h-8 px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-shrink-0 flex items-center justify-center h-8 px-4 bg-teal-700 rounded-lg text-sm font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="w-4 h-4 text-white" />
                        Salvando...
                      </span>
                    ) : (
                      "Salvar"
                    )}
                  </button>
                </div>
              )}
            </div>

            <textarea
              value={historyAndDiagnosis}
              readOnly={!isEditingHistory}
              onChange={(e) => setHistoryAndDiagnosis(e.target.value)}
              placeholder="Descreva o histórico clínico e diagnóstico..."
              className={textareaClass(isEditingHistory)}
            />
          </div>

          {/* ── IMAGENS DO EXAME ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-3xl p-4">
            <h3 className="text-base font-bold text-black leading-loose">
              IMAGENS DO EXAME
            </h3>

            {/* Dropzone */}
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
              className="flex flex-col items-center justify-center gap-2 w-full py-2 pl-4 pr-2 bg-gray-100 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
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
              <span className="text-sm text-gray-500 text-center">
                {isUploadingImages
                  ? "Enviando..."
                  : "Clique para anexar imagens do exame (Raio-X, Ressonâncias, etc)"}
              </span>
            </button>

            {/* Arquivos enviados + em envio */}
            {(imageUploadItems.length > 0 || examImages.length > 0) && (
              <div className="flex flex-col gap-2">
                {/* Em envio */}
                {imageUploadItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-lg"
                  >
                    <span className="flex-1 text-sm font-semibold text-gray-900 truncate">
                      {item.name}{" "}
                      <span className="font-normal text-gray-400">
                        ({formatBytes(item.size)})
                      </span>
                    </span>
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
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
                    className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-lg"
                  >
                    <a
                      href={doc.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm font-semibold text-gray-900 truncate hover:text-teal-700 hover:underline transition-colors"
                    >
                      {doc.name}
                    </a>
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      <div className="h-full w-full bg-teal-600 rounded-full" />
                    </div>
                    <button
                      onClick={() =>
                        handleDeleteDocument(doc.id, "exam_images")
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── CONDUTA ──────────────────────────────────────────────────── */}
          <div className="flex flex-col items-end gap-4 w-full bg-white border border-gray-200 rounded-3xl p-4">
            <div className="flex items-center justify-between w-full gap-4">
              <h3 className="text-base font-bold text-black leading-loose">
                CONDUTA
              </h3>
              {!isEditingConduct ? (
                <button
                  onClick={() => setIsEditingConduct(true)}
                  className={editarBtnClass}
                >
                  Editar
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-shrink-0 flex items-center justify-center h-8 px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-shrink-0 flex items-center justify-center h-8 px-4 bg-teal-700 rounded-lg text-sm font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="w-4 h-4 text-white" />
                        Salvando...
                      </span>
                    ) : (
                      "Salvar"
                    )}
                  </button>
                </div>
              )}
            </div>

            <textarea
              value={conduct}
              readOnly={!isEditingConduct}
              onChange={(e) => setConduct(e.target.value)}
              placeholder="Descreva a conduta cirúrgica proposta..."
              className={textareaClass(isEditingConduct)}
            />
          </div>

          {/* ─── Laudo Assinado ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-3xl p-4">
            <h3 className="text-base font-bold text-black leading-loose">
              LAUDO ASSINADO
            </h3>
            {!signedUploadItem && signedReports.length === 0 && (
              <div className="flex items-center gap-2 w-full py-3 pl-4 pr-2 bg-gray-100 border border-dashed border-gray-200 rounded-lg">
                <p className="text-sm text-gray-500 leading-snug flex-1">
                  Após baixar e assinar o laudo gerado abaixo, insira o arquivo
                  assinado.
                </p>
                <input
                  ref={signedReportInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleUploadSignedReport}
                />
                <button
                  type="button"
                  onClick={() => signedReportInputRef.current?.click()}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-lg text-sm text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <span>Selecionar arquivo</span>
                </button>
              </div>
            )}
            {(signedUploadItem || signedReports.length > 0) && (
              <div className="flex flex-col gap-2">
                {/* Em envio */}
                {signedUploadItem && (
                  <div className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-lg">
                    <span className="flex-1 text-sm font-semibold text-gray-900 truncate">
                      {signedUploadItem.name}{" "}
                      <span className="font-normal text-gray-400">
                        ({formatBytes(signedUploadItem.size)})
                      </span>
                    </span>
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all duration-300"
                        style={{ width: `${signedUploadItem.progress}%` }}
                      />
                    </div>
                    <div className="w-6 h-6 flex-shrink-0" />
                  </div>
                )}
                {/* Já carregados */}
                {signedReports.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-lg"
                  >
                    <a
                      href={doc.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm font-semibold text-gray-900 truncate hover:text-teal-700 hover:underline transition-colors"
                    >
                      {doc.name}
                    </a>
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      <div className="h-full w-full bg-teal-600 rounded-full" />
                    </div>
                    <button
                      onClick={() =>
                        handleDeleteDocument(doc.id, "signed_report")
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Divisor ─────────────────────────────────────────────────────── */}
        <hr className="border-gray-200" />

        {/* ─── Botões de ação ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 w-full">
          {(() => {
            const canExport =
              !!patientData.name.trim() && !!historyAndDiagnosis.trim();
            return (
              <>
                <button
                  onClick={() => setShowPreview(true)}
                  disabled={!canExport}
                  className="flex items-center h-10 px-4 text-sm font-semibold text-teal-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  Pré-visualizar
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf || !canExport}
                  className="flex items-center h-10 px-4 bg-white border border-gray-200 shadow-sm text-sm font-semibold text-teal-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
