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
  const [latestSolicitacao, setLatestSolicitacao] =
    useState<SurgeryRequestDetail>(solicitacao);

  const request = latestSolicitacao ?? solicitacao;

  const documentTypeLabel = (key?: string) => {
    switch (key) {
      case "personal_document":
        return "RG/CNH";
      case "health_plan_card":
        return "Carteirinha do Convênio";
      case "exam":
        return "Exames";
      case "exam_report":
        return "Laudo do Exame";
      case "clinical_history":
        return "Histórico Clínico";
      case "medical_conduct":
        return "Conduta Médica";
      case "signed_report":
        return "Laudo Assinado";
      default:
        return "Documento";
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setSignatureUrl(request?.doctor?.signatureUrl ?? "");
  }, [isOpen, request]);

  useEffect(() => {
    if (!isOpen || !solicitacao?.id) return;

    let active = true;
    surgeryRequestService
      .getById(solicitacao.id)
      .then((data) => {
        if (active) setLatestSolicitacao(data);
      })
      .catch(() => {
        if (active) setLatestSolicitacao(solicitacao);
      });

    return () => {
      active = false;
    };
  }, [isOpen, solicitacao]);

  useEffect(() => {
    if (!isOpen || !request?.id) return;
    surgeryRequestService
      .getSections(request.id)
      .then(setSections)
      .catch(() => setSections([]));
  }, [isOpen, request?.id]);

  if (!isOpen) return null;

  const reportData = parseMedicalReport(request);
  const pd = reportData?.patientData ?? {};
  const patient = request?.patient;

  const patientName = pd.name || patient?.name || undefined;
  const patientBirthDate =
    formatDateBR(pd.birthDate || patient?.birthDate || "") || undefined;
  const patientRg = pd.rg || patient?.rg || undefined;
  const patientCpf = formatCpf(pd.cpf || patient?.cpf || "") || undefined;
  const patientPhone =
    formatPhone(pd.phone || patient?.phone || "") || undefined;
  const patientAddress = pd.address || patient?.address || undefined;
  const patientZipCode =
    pd.zipCode || patient?.zipCode || (patient as any)?.cep || undefined;
  const patientHealthPlan =
    pd.healthPlan || request?.healthPlan?.name || undefined;

  const procedures: TussItemRef[] = request?.tussItems ?? [];
  const opmeItems: OpmeItemRef[] = request?.opmeItems ?? [];

  const splitList = (value?: string) =>
    (value ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

  const fabricantesText =
    unique(opmeItems.flatMap((i) => splitList(i.brand))).join(", ") || "";
  const fornecedoresText =
    unique(
      opmeItems.flatMap((i) => [
        ...splitList(i.distributor),
        ...((i.suppliers ?? []).map((s) => s.name).filter(Boolean) as string[]),
      ]),
    ).join(", ") || "";

  const hospitalName = request?.hospital?.name || "";
  const hospitalAddress = request?.hospital?.address || "";
  const localText =
    [hospitalName, hospitalAddress].filter(Boolean).join(" – ") || "";
  const hasSeparator = !!(fabricantesText || fornecedoresText || localText);

  const doctorUser = request?.doctor ?? null;
  const doctorProfile = doctorUser?.doctorProfile ?? null;
  const doctorName = doctorUser?.name ?? "Médico";
  const doctorEmail = doctorUser?.email || "";
  const doctorPhone = formatPhone(doctorUser?.phone ?? "") || "";
  const doctorSpecialty = doctorProfile?.specialty || "";
  const doctorCrm = doctorProfile?.crm
    ? `CRM ${doctorProfile.crm}${doctorProfile.crmState ? `/${doctorProfile.crmState}` : ""}`
    : "";

  const customHeader = doctorProfile?.header
    ? {
        logoUrl: doctorProfile.header.logoUrl ?? null,
        logoPosition: (doctorProfile.header.logoPosition ?? "left") as
          | "left"
          | "center"
          | "right",
        contentHtml: doctorProfile.header.contentHtml ?? null,
      }
    : null;

  const today = new Date().toLocaleDateString("pt-BR");

  const examImages = (
    request?.documents?.filter((d) => d.key === "report_images") ?? []
  ).map((d) => ({ id: d.id, name: d.name, uri: d.uri }));

  const attachedDocuments =
    request?.documents?.filter(
      (d) => d.key !== "report_images" && d.path?.startsWith("documents/"),
    ) ?? [];

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const { default: api } = await import("@/lib/api");
      const response = await api.get(
        `/surgery-requests/${request.id}/export-pdf`,
        { responseType: "arraybuffer" },
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      // silently fail
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col bg-white w-full md:max-w-[720px] md:mx-4 rounded-t-3xl md:rounded-2xl max-h-[calc(92vh-64px)] md:max-h-[92vh] shadow-xl overflow-hidden animate-slide-up md:animate-scale-in mobile-sheet-offset">
        <div className="flex md:hidden justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-sm md:text-lg font-semibold text-gray-900">
            Pré-visualização da Solicitação Cirúrgica
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto overscroll-contain bg-gray-100 p-4 md:p-6">
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

          {attachedDocuments.length > 0 && (
            <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Documentos anexados na SC
              </h3>
              <ul className="space-y-1.5">
                {attachedDocuments.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <a
                      href={doc.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 hover:text-teal-700 hover:underline truncate"
                    >
                      {doc.name}
                    </a>
                    <span className="text-gray-500 shrink-0">
                      {documentTypeLabel(doc.key)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 md:px-6 md:py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="ds-btn-outline flex-1 md:flex-none"
          >
            Fechar
          </button>
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="ds-btn-primary flex-1 md:flex-none disabled:opacity-50"
          >
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
