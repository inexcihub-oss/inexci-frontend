"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { sanitizeHtml } from "@/lib/sanitize-html";
import {
  surgeryRequestService,
  ReportSection,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";

// ─── Interface ────────────────────────────────────────────────────────────────

interface MedicalReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function parseMedicalReport(sol: any) {
  if (!sol?.medical_report) return {};
  try {
    return JSON.parse(sol.medical_report);
  } catch {
    return {};
  }
}

// ─── removeBackground ───────────────────────────────────────────────────────

function removeBackground(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(imageUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const { width, height } = canvas;
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // ── 1. Amostra os 4 cantos para detectar a cor do fundo ──────────────
      function cornerColor(x: number, y: number): [number, number, number] {
        const idx = (y * width + x) * 4;
        return [data[idx], data[idx + 1], data[idx + 2]];
      }
      const corners = [
        cornerColor(0, 0),
        cornerColor(width - 1, 0),
        cornerColor(0, height - 1),
        cornerColor(width - 1, height - 1),
      ];
      // Média dos cantos = cor dominante do fundo
      const bgR = corners.reduce((s, c) => s + c[0], 0) / 4;
      const bgG = corners.reduce((s, c) => s + c[1], 0) / 4;
      const bgB = corners.reduce((s, c) => s + c[2], 0) / 4;

      // ── 2. Remove pixels próximos ao fundo; suaviza a borda ──────────────
      const tolerance = 40; // distância máxima para considerar fundo
      const softRange = 20; // faixa de suavização

      for (let i = 0; i < data.length; i += 4) {
        const dr = data[i] - bgR;
        const dg = data[i + 1] - bgG;
        const db = data[i + 2] - bgB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        if (dist <= tolerance) {
          data[i + 3] = 0;
        } else if (dist <= tolerance + softRange) {
          const t = (dist - tolerance) / softRange;
          data[i + 3] = Math.round(t * data[i + 3]);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
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

// ─── ExamImageItem ────────────────────────────────────────────────────────────

function ExamImageItem({
  doc,
}: {
  doc: { id: string; name: string; uri: string };
}) {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <a
        href={doc.uri}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center gap-2 aspect-square px-2 bg-gray-50 border border-dashed border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none">
          <path
            d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 2V8H20M16 13H8M16 17H8M10 9H8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xs text-teal-600 font-medium">Abrir arquivo</span>
        <span className="text-xs text-gray-400 truncate w-full text-center px-1">
          {doc.name}
        </span>
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={doc.uri}
        alt={doc.name}
        onError={() => setFailed(true)}
        className="w-full aspect-square object-cover rounded-xl border border-dashed border-gray-200 bg-gray-50"
      />
      <span className="text-xs text-gray-400 text-center truncate px-1">
        {doc.name}
      </span>
    </div>
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function MedicalReportPreviewModal({
  isOpen,
  onClose,
  solicitacao,
}: MedicalReportPreviewModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  // ── Seções dinâmicas do laudo ────────────────────────────────────────────
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    if (!isOpen || !solicitacao?.id) return;
    surgeryRequestService
      .getSections(solicitacao.id)
      .then(setSections)
      .catch(() => setSections([]));
  }, [isOpen, solicitacao?.id]);

  // ── Dados da assinatura do médico ────────────────────────────────────────
  const [doctorSignatureUrl, setDoctorSignatureUrl] = useState<string | null>(
    null,
  );
  const [doctorName, setDoctorName] = useState<string>("");
  const [doctorSpecialty, setDoctorSpecialty] = useState<string>("");
  const [doctorCrm, setDoctorCrm] = useState<string>("");
  const [doctorCrmState, setDoctorCrmState] = useState<string>("");

  const [processedSignatureUrl, setProcessedSignatureUrl] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!isOpen) return;
    // Usa exclusivamente os dados do médico vinculado à solicitação.
    // Nova estrutura: doctor = User, doctor.doctor_profile = DoctorProfile
    // O backend já converte signature_url para URL assinada em findOne().
    const doctor = solicitacao?.doctor;
    const dp = doctor?.doctor_profile;
    setDoctorSignatureUrl(doctor?.signature_url ?? dp?.signature_url ?? null);
    setDoctorName(doctor?.name ?? "");
    setDoctorSpecialty(dp?.specialty ?? "");
    setDoctorCrm(dp?.crm ?? "");
    setDoctorCrmState(dp?.crm_state ?? "");
  }, [isOpen, solicitacao]);

  useEffect(() => {
    if (!doctorSignatureUrl) {
      setProcessedSignatureUrl(null);
      return;
    }
    removeBackground(doctorSignatureUrl)
      .then(setProcessedSignatureUrl)
      .catch(() => setProcessedSignatureUrl(doctorSignatureUrl));
  }, [doctorSignatureUrl]);

  if (!isOpen) return null;

  // ── Dados do laudo ───────────────────────────────────────────────────────
  const report = parseMedicalReport(solicitacao);
  const pd = report?.patientData ?? {};
  const patient = solicitacao?.patient;

  const name = pd?.name || patient?.name || "";
  const birthDate = pd?.birthDate || "";
  const rg = pd?.rg || patient?.rg || "";
  const cpf = pd?.cpf || patient?.cpf || "";
  const phone = pd?.phone || patient?.phone || "";
  const address = pd?.address || patient?.address || "";
  const zipCode = pd?.zipCode || patient?.zip_code || patient?.cep || "";
  const healthPlan = pd?.healthPlan || solicitacao?.health_plan?.name || "";

  // Seções dinâmicas têm prioridade; fallback para campos legados
  const legacyHistoryAndDiagnosis =
    sections.length === 0
      ? report?.historyAndDiagnosis || report?.surgicalIndication || ""
      : "";
  const legacyConduct =
    sections.length === 0
      ? report?.conduct || report?.technicalJustification || ""
      : "";

  const examImages: Array<{ id: string; name: string; uri: string }> =
    solicitacao?.documents?.filter((d: any) => d.key === "report_images") ?? [];

  const today = new Date().toLocaleDateString("pt-BR");

  // ── Handler PDF ──────────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const response = await api.get(
        `/surgery-requests/${solicitacao.id}/report-pdf`,
        { responseType: "arraybuffer" },
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laudo-${solicitacao.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      showToast("Erro ao exportar PDF", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal — bottom sheet no mobile, centralizado no desktop */}
      <div className="relative z-10 flex flex-col bg-white w-full md:max-w-3xl md:mx-4 md:my-6 rounded-t-3xl md:rounded-2xl max-h-[calc(92vh-64px)] md:max-h-[85vh] shadow-xl overflow-hidden">
        {/* Drag handle — apenas mobile */}
        <div className="flex md:hidden justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 md:px-6 md:py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm md:text-lg font-semibold text-gray-900">
            Pré-visualização do Laudo Médico
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Scrollable Content ─────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 overflow-y-auto overscroll-contain gap-6 p-5 md:p-6">
          {/* ── Corpo do Documento ─────────────────────────────────────── */}
          <div className="flex flex-col gap-3 md:gap-6 w-full">
            {/* Título + Data — alinhados nas extremidades */}
            <div className="flex items-end justify-between pb-px">
              <span className="text-xl font-bold text-black">LAUDO MÉDICO</span>
              <span className="text-xs text-gray-500">Data: {today}</span>
            </div>

            {/* ── DADOS DO PACIENTE ──────────────────────────────────── */}
            <div className="flex flex-col gap-2.5 w-full">
              <div className="pb-2 border-b border-gray-200">
                <h3 className="text-sm md:text-base font-bold text-black">
                  DADOS DO PACIENTE
                </h3>
              </div>
              {/* Grid 2 colunas — apenas campos preenchidos são exibidos */}
              <div className="grid grid-cols-2 gap-y-1.5 w-full">
                {name && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-black">
                      Nome:
                    </span>
                    <span className="text-xs text-black">{name}</span>
                  </div>
                )}
                {birthDate && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-black">
                      Data de Nascimento:
                    </span>
                    <span className="text-xs text-black">{birthDate}</span>
                  </div>
                )}
                {rg && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-black">
                      RG:
                    </span>
                    <span className="text-xs text-black">{rg}</span>
                  </div>
                )}
                {cpf && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-black">
                      CPF:
                    </span>
                    <span className="text-xs text-black">{cpf}</span>
                  </div>
                )}
                {address && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-black">
                      Endereço:
                    </span>
                    <span className="text-xs text-black">{address}</span>
                  </div>
                )}
                {zipCode && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-black">
                      CEP:
                    </span>
                    <span className="text-xs text-black">{zipCode}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-black">
                      Telefone:
                    </span>
                    <span className="text-xs text-black">{phone}</span>
                  </div>
                )}
                {healthPlan && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-black">
                      Convênio:
                    </span>
                    <span className="text-xs text-black">{healthPlan}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── SEÇÕES DO LAUDO ──────────────────────────────── */}
            {sections.length > 0 ? (
              sections.map((section) => (
                <div key={section.id} className="flex flex-col gap-2.5 w-full">
                  <div className="pb-2 border-b border-gray-200">
                    <h3 className="text-sm md:text-base font-bold tracking-tight text-neutral-900">
                      {section.title.toUpperCase()}
                    </h3>
                  </div>
                  {section.description ? (
                    <div
                      className="text-xs text-neutral-600 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(section.description),
                      }}
                    />
                  ) : (
                    <p className="text-xs text-neutral-400 italic">—</p>
                  )}
                </div>
              ))
            ) : (
              /* ── Fallback legado ─────────────────────────────── */
              <>
                {legacyHistoryAndDiagnosis && (
                  <div className="flex flex-col gap-2.5 w-full">
                    <div className="pb-2 border-b border-gray-200">
                      <h3 className="text-sm md:text-base font-bold tracking-tight text-neutral-900">
                        HISTÓRICO E DIAGNÓSTICO
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                      {legacyHistoryAndDiagnosis}
                    </p>
                  </div>
                )}
                {legacyConduct && (
                  <div className="flex flex-col gap-2.5 w-full">
                    <div className="pb-2 border-b border-gray-200">
                      <h3 className="text-sm md:text-base font-bold tracking-tight text-neutral-900">
                        CONDUTA
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                      {legacyConduct}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ── IMAGENS A SEREM ANEXADAS AO LAUDO ───────────────────── */}
            {examImages.length > 0 && (
              <div className="flex flex-col gap-2.5 w-full">
                <div className="grid grid-cols-3 gap-3">
                  {examImages.map((doc) => (
                    <ExamImageItem key={doc.id} doc={doc} />
                  ))}
                </div>
              </div>
            )}

            {/* ── ASSINATURA DO MÉDICO ───────────────────────────────── */}
            <div className="flex flex-col items-center gap-1 w-full pt-2">
              {doctorSignatureUrl && (
                <img
                  src={processedSignatureUrl ?? doctorSignatureUrl}
                  alt="Assinatura do médico"
                  className="h-14 max-w-xs object-contain mb-1"
                />
              )}
              <hr className="w-48 border-t border-gray-400" />
              <div className="flex flex-col items-center gap-0.5 mt-1">
                {doctorName && (
                  <span className="text-xs md:text-sm font-bold text-black">
                    {doctorName}
                  </span>
                )}
                {doctorSpecialty && (
                  <span className="text-xs text-gray-600">
                    {doctorSpecialty}
                  </span>
                )}
                {doctorCrm && (
                  <span className="text-xs text-gray-600">
                    CRM {doctorCrm}
                    {doctorCrmState ? `/${doctorCrmState}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Footer ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 md:px-3 border-t-2 border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex items-center justify-center h-10 px-4 bg-white border border-gray-200 shadow-sm rounded-xl text-xs md:text-sm text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
          {/* Exportar PDF: bg #147471; padding 10px 24px → py-2.5 px-6 */}
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 py-2.5 px-6 bg-teal-700 rounded-xl text-xs md:text-sm font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Spinner />
                <span>Exportando...</span>
              </>
            ) : (
              "Exportar PDF"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
