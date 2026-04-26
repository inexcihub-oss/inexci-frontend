"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  SurgeryRequestDetail,
  TussItemRef,
  OpmeItemRef,
  ReportSection,
  surgeryRequestService,
} from "@/services/surgery-request.service";
import {
  SurgeryRequestLaudoDocument,
  parseMedicalReport,
  formatCpf,
  formatPhone,
  formatDateBR,
  unique,
} from "./SurgeryRequestLaudoDocument";

interface SurgeryRequestDocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
}

export function SurgeryRequestDocumentPreviewModal({
  isOpen,
  onClose,
  solicitacao,
}: SurgeryRequestDocumentPreviewModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setSignatureUrl(solicitacao?.doctor?.signature_url ?? "");
  }, [isOpen, solicitacao]);

  useEffect(() => {
    if (!isOpen || !solicitacao?.id) return;
    surgeryRequestService
      .getSections(solicitacao.id)
      .then(setSections)
      .catch(() => setSections([]));
  }, [isOpen, solicitacao?.id]);

  if (!isOpen) return null;

  const reportData = parseMedicalReport(solicitacao);
  const pd = reportData?.patientData ?? {};
  const patient = solicitacao?.patient;

  const patientName = pd.name || patient?.name || undefined;
  const patientBirthDate =
    formatDateBR(pd.birthDate || patient?.birth_date || "") || undefined;
  const patientRg = pd.rg || patient?.rg || undefined;
  const patientCpf = formatCpf(pd.cpf || patient?.cpf || "") || undefined;
  const patientPhone =
    formatPhone(pd.phone || patient?.phone || "") || undefined;
  const patientAddress = pd.address || patient?.address || undefined;
  const patientZipCode =
    pd.zipCode || patient?.zip_code || (patient as any)?.cep || undefined;
  const patientHealthPlan =
    pd.healthPlan || solicitacao?.health_plan?.name || undefined;

  const procedures: TussItemRef[] = solicitacao?.tuss_items ?? [];
  const opmeItems: OpmeItemRef[] = solicitacao?.opme_items ?? [];

  const fabricantesText =
    unique(opmeItems.map((i) => i.brand).filter(Boolean) as string[]).join(
      ", ",
    ) || "";
  const fornecedoresText =
    unique(
      opmeItems.map((i) => i.distributor).filter(Boolean) as string[],
    ).join(", ") || "";

  const hospitalName = solicitacao?.hospital?.name || "";
  const hospitalAddress = solicitacao?.hospital?.address || "";
  const localText =
    [hospitalName, hospitalAddress].filter(Boolean).join(" – ") || "";
  const hasSeparator = !!(fabricantesText || fornecedoresText || localText);

  const doctorUser = solicitacao?.doctor ?? null;
  const doctorProfile = doctorUser?.doctor_profile ?? null;
  const doctorName = doctorUser?.name ?? "Médico";
  const doctorEmail = doctorUser?.email || "";
  const doctorPhone = formatPhone(doctorUser?.phone ?? "") || "";
  const doctorSpecialty = doctorProfile?.specialty || "";
  const doctorCrm = doctorProfile?.crm
    ? `CRM ${doctorProfile.crm}${doctorProfile.crm_state ? `/${doctorProfile.crm_state}` : ""}`
    : "";

  const customHeader = doctorProfile?.header
    ? {
        logoUrl: doctorProfile.header.logo_url ?? null,
        logoPosition: (doctorProfile.header.logo_position ?? "left") as
          | "left"
          | "right",
        contentHtml: doctorProfile.header.content_html ?? null,
      }
    : null;

  const today = new Date().toLocaleDateString("pt-BR");

  const examImages = (
    solicitacao?.documents?.filter((d) => d.key === "report_images") ?? []
  ).map((d) => ({ id: d.id, name: d.name, uri: d.uri }));

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const { default: api } = await import("@/lib/api");
      const response = await api.get(
        `/surgery-requests/${solicitacao.id}/report-pdf`,
        { responseType: "arraybuffer" },
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `solicitacao-${solicitacao.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      // silently fail
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col bg-white rounded-xl shadow-xl overflow-hidden w-full max-w-[720px] max-h-[92vh]">
        <div className="flex items-center justify-between px-4 sm:px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 shrink-0">
          <h2 className="ds-modal-title">
            Pré-visualização da Solicitação Cirúrgica
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 active:scale-[0.95] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto bg-gray-100 p-6">
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
            legacyHistoryAndDiagnosis={reportData.historyAndDiagnosis}
            legacyConduct={reportData.conduct}
            examImages={examImages}
            procedures={procedures}
            opmeItems={opmeItems}
            fabricantesText={fabricantesText}
            fornecedoresText={fornecedoresText}
            hasSeparator={hasSeparator}
            localText={localText}
            doctorName={doctorName}
            doctorEmail={doctorEmail}
            doctorPhone={doctorPhone}
            doctorSpecialty={doctorSpecialty}
            doctorCrm={doctorCrm}
            doctorSignatureUrl={signatureUrl || undefined}
            customHeader={customHeader}
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-4 py-3 md:px-6 md:py-4 border-t border-gray-200 shrink-0">
          <button onClick={onClose} className="ds-btn-outline">
            Fechar
          </button>
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="ds-btn-primary disabled:opacity-50"
          >
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
