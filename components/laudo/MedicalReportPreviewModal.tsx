"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import {
  surgeryRequestService,
  ReportSection,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import {
  SurgeryRequestLaudoDocument,
  parseMedicalReport,
  formatCpf,
  formatPhone,
  formatDateBR,
} from "./SurgeryRequestLaudoDocument";

// ─── Interface ────────────────────────────────────────────────────────────────

interface MedicalReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
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
  const [customHeader, setCustomHeader] = useState<{
    logoUrl?: string | null;
    logoPosition?: "left" | "right";
    contentHtml?: string | null;
  } | null>(null);

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

    const rawHeader = dp?.header;
    setCustomHeader(
      rawHeader
        ? {
            logoUrl: rawHeader.logo_url ?? null,
            logoPosition: (rawHeader.logo_position ?? "left") as
              | "left"
              | "right",
            contentHtml: rawHeader.content_html ?? null,
          }
        : null,
    );
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

  const patientName = pd?.name || patient?.name || undefined;
  const patientBirthDate =
    formatDateBR(pd?.birthDate || patient?.birth_date || "") || undefined;
  const patientRg = pd?.rg || patient?.rg || undefined;
  const patientCpf = formatCpf(pd?.cpf || patient?.cpf || "") || undefined;
  const patientPhone =
    formatPhone(pd?.phone || patient?.phone || "") || undefined;
  const patientAddress = pd?.address || patient?.address || undefined;
  const patientZipCode =
    pd?.zipCode || patient?.zip_code || (patient as any)?.cep || undefined;
  const patientHealthPlan =
    pd?.healthPlan || solicitacao?.health_plan?.name || undefined;

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
        <div className="flex-1 overflow-y-auto overflow-x-auto overscroll-contain bg-gray-100 p-5 md:p-6">
          <SurgeryRequestLaudoDocument
            today={today}
            patientName={patientName}
            patientBirthDate={patientBirthDate}
            patientRg={patientRg}
            patientCpf={patientCpf}
            patientPhone={patientPhone}
            patientAddress={patientAddress}
            patientZipCode={patientZipCode}
            patientHealthPlan={patientHealthPlan}
            sections={sections}
            legacyHistoryAndDiagnosis={legacyHistoryAndDiagnosis}
            legacyConduct={legacyConduct}
            examImages={examImages}
            doctorName={doctorName}
            doctorSpecialty={doctorSpecialty}
            doctorCrm={
              doctorCrm
                ? `CRM ${doctorCrm}${doctorCrmState ? `/${doctorCrmState}` : ""}`
                : ""
            }
            doctorSignatureUrl={
              processedSignatureUrl ?? doctorSignatureUrl ?? undefined
            }
            customHeader={customHeader}
          />
        </div>

        {/* ─── Footer ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 md:px-3 border-t-2 border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex items-center justify-center h-10 px-4 bg-white border border-gray-200 shadow-sm rounded-xl text-xs md:text-sm text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
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
