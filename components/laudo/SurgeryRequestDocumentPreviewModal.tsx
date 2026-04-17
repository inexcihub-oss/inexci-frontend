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
import { sanitizeHtml } from "@/lib/sanitize-html";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface SurgeryRequestDocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ParsedPatientData {
  name?: string;
  birthDate?: string;
  rg?: string;
  cpf?: string;
  phone?: string;
  address?: string;
  zipCode?: string;
  healthPlan?: string;
}

interface ParsedMedicalReport {
  patientData?: ParsedPatientData;
  historyAndDiagnosis?: string;
  surgicalIndication?: string;
  conduct?: string;
  technicalJustification?: string;
  [key: string]: unknown;
}

function parseMedicalReport(sol: SurgeryRequestDetail): ParsedMedicalReport {
  if (!sol?.medical_report) return {};
  try {
    return JSON.parse(sol.medical_report) as ParsedMedicalReport;
  } catch {
    return {};
  }
}

function unique(arr: (string | undefined)[]): string[] {
  return Array.from(new Set(arr.filter((x): x is string => Boolean(x))));
}

/** Remove tudo que não for dígito */
function digitsOnly(v: string): string {
  return v ? v.replace(/\D/g, "") : "";
}

/** Formata CPF: XXX.XXX.XXX-XX */
function formatCpf(v: string): string {
  if (!v) return "";
  const d = digitsOnly(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Formata CEP: XXXXX-XXX */
function formatCep(v: string): string {
  if (!v) return "";
  const d = digitsOnly(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Formata telefone: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX */
function formatPhone(v: string): string {
  if (!v) return "";
  const d = digitsOnly(v).slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Formata data ISO para DD/MM/AAAA, ou retorna como está se já formatada */
function formatDateBR(v: string): string {
  if (!v) return "";
  // Já está no formato DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
  // ISO: AAAA-MM-DD ou AAAA-MM-DDTHH:mm...
  const match = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return v;
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
        className="flex flex-col items-center justify-center gap-2 aspect-square px-2 bg-gray-50 border border-dashed border-[#DCDFE3] rounded-xl hover:bg-gray-100 transition-colors"
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
        className="w-full aspect-square object-cover rounded-xl border border-dashed border-[#DCDFE3] bg-gray-50"
      />
      <span className="text-xs text-gray-400 text-center truncate px-1">
        {doc.name}
      </span>
    </div>
  );
}

// ─── TableHeader ─────────────────────────────────────────────────────────────

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] font-medium leading-[1.333] text-[#111111] px-[10px] py-1">
      {children}
    </div>
  );
}

// ─── Procedimentos Table ──────────────────────────────────────────────────────

function ProceduresTable({ procedures }: { procedures: TussItemRef[] }) {
  if (!procedures || procedures.length === 0) return null;

  return (
    <div className="w-full border border-[#DCDFE3] text-[12px] text-[#111111]">
      {/* Header row */}
      <div className="flex border-b border-[#DCDFE3]">
        <div className="flex-[3] border-r border-[#DCDFE3]">
          <TableHeader>Procedimentos</TableHeader>
        </div>
        <div className="flex-[1.5] border-r border-[#DCDFE3]">
          <TableHeader>TUSS</TableHeader>
        </div>
        <div className="flex-[0.8]">
          <TableHeader>Quantidade</TableHeader>
        </div>
      </div>
      {/* Data rows */}
      {procedures.map((proc, idx: number) => {
        const isEven = idx % 2 === 0;
        const bg = isEven ? "bg-[#F2F2F2]" : "bg-white";
        return (
          <div
            key={proc.id ?? idx}
            className={`flex border-b border-[#DCDFE3] last:border-b-0 ${bg}`}
          >
            <div className="flex-[3] px-[10px] py-2 border-r border-[#DCDFE3] leading-[1.333]">
              {proc.name || "—"}
            </div>
            <div className="flex-[1.5] px-[10px] py-2 border-r border-[#DCDFE3] leading-[1.333]">
              {proc.tuss_code || "—"}
            </div>
            <div className="flex-[0.8] px-[10px] py-2 leading-[1.333]">
              {proc.quantity ?? 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Materials Table ──────────────────────────────────────────────────────────

function MaterialsTable({ opmeItems }: { opmeItems: OpmeItemRef[] }) {
  if (!opmeItems || opmeItems.length === 0) return null;

  return (
    <div className="w-full border border-[#DCDFE3] text-[12px] text-[#111111]">
      {/* Header row */}
      <div className="flex border-b border-[#DCDFE3]">
        <div className="flex-[4] border-r border-[#DCDFE3]">
          <TableHeader>Material</TableHeader>
        </div>
        <div className="flex-[1]">
          <TableHeader>Quantidade</TableHeader>
        </div>
      </div>
      {/* Data rows */}
      {opmeItems.map((item, idx: number) => {
        const isEven = idx % 2 === 0;
        const bg = isEven ? "bg-[#F2F2F2]" : "bg-white";
        return (
          <div
            key={item.id ?? idx}
            className={`flex border-b border-[#DCDFE3] last:border-b-0 ${bg}`}
          >
            <div className="flex-[4] px-[10px] py-2 border-r border-[#DCDFE3] leading-[1.333]">
              {item.name || "—"}
            </div>
            <div className="flex-[1] px-[10px] py-2 leading-[1.333]">
              {item.quantity ?? 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-2 border-b border-[#E5E5E5]">
      <h3 className="text-[14px] font-semibold leading-[1.143] text-[#171717]">
        {children}
      </h3>
    </div>
  );
}

// ─── A4 Page ──────────────────────────────────────────────────────────────────

function A4Page({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white shadow-md flex flex-col"
      style={{
        width: "595px",
        minHeight: "842px",
        padding: "32px",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function SurgeryRequestDocumentPreviewModal({
  isOpen,
  onClose,
  solicitacao,
}: SurgeryRequestDocumentPreviewModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [sections, setSections] = useState<ReportSection[]>([]);

  // Usa exclusivamente a assinatura do médico vinculado à solicitação.
  // O backend já converte signature_url para URL assinada em findOne().
  useEffect(() => {
    if (!isOpen) return;
    const doctor = solicitacao?.doctor;
    setSignatureUrl(doctor?.signature_url ?? "");
  }, [isOpen, solicitacao]);

  // Carrega seções dinâmicas do laudo
  useEffect(() => {
    if (!isOpen || !solicitacao?.id) return;
    surgeryRequestService
      .getSections(solicitacao.id)
      .then(setSections)
      .catch(() => setSections([]));
  }, [isOpen, solicitacao?.id]);

  if (!isOpen) return null;

  // ── Dados do laudo ───────────────────────────────────────────────────────
  const report = parseMedicalReport(solicitacao);
  const pd = report?.patientData ?? {};
  const patient = solicitacao?.patient;

  const name = pd?.name || patient?.name || "";
  const birthDate = formatDateBR(pd?.birthDate || patient?.birth_date || "");
  const rg = pd?.rg || patient?.rg || "";
  const cpf = formatCpf(pd?.cpf || patient?.cpf || "");
  const phone = formatPhone(pd?.phone || patient?.phone || "");
  const address = pd?.address || patient?.address || "";
  const zipCode = formatCep(
    pd?.zipCode || patient?.zip_code || patient?.cep || "",
  );
  const healthPlan = pd?.healthPlan || solicitacao?.health_plan?.name || "";

  // ── Procedimentos e OPME ─────────────────────────────────────────────────
  const procedures: TussItemRef[] = solicitacao?.tuss_items ?? [];
  const opmeItems: OpmeItemRef[] = solicitacao?.opme_items ?? [];

  // ── Fabricantes e Fornecedores ────────────────────────────────────────────
  const fabricantes = unique(opmeItems.map((i) => i.brand).filter(Boolean));
  const fornecedores = unique(
    opmeItems.map((i) => i.distributor).filter(Boolean),
  );

  // ── Imagens de exame ─────────────────────────────────────────────────────
  const examImages: Array<{ id: string; name: string; uri: string }> =
    solicitacao?.documents?.filter((d) => d.key === "report_images") ?? [];

  // ── Hospital (Local) ─────────────────────────────────────────────────────
  const hospitalName = solicitacao?.hospital?.name || "";
  const hospitalAddress = solicitacao?.hospital?.address || "";
  const localText = [hospitalName, hospitalAddress].filter(Boolean).join(" – ");

  // ── Dados do médico (doctor → User; doctor.doctor_profile → DoctorProfile) ─
  // solicitacao.doctor                = User          → name, email, phone
  // solicitacao.doctor.doctor_profile = DoctorProfile → crm, specialty, crm_state
  const doctorUser = solicitacao?.doctor ?? null;
  const doctorProfile = doctorUser?.doctor_profile ?? null;

  const doctorName = doctorUser?.name ?? "";
  const doctorEmail = doctorUser?.email ?? "";
  const doctorPhone = formatPhone(doctorUser?.phone ?? "");
  const doctorSpecialty = doctorProfile?.specialty ?? "";
  const crmNum = doctorProfile?.crm ?? "";
  const crmState = doctorProfile?.crm_state ?? "";
  const doctorCRM = crmNum
    ? `CRM ${crmNum}${crmState ? `/${crmState}` : ""}`
    : "";

  const today = new Date().toLocaleDateString("pt-BR");

  // ── Handler PDF ──────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 flex flex-col bg-white rounded-xl shadow-xl overflow-hidden w-full max-w-[720px] max-h-[92vh]">
        {/* Header */}
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

        {/* Scrollable content — simula pages A4 */}
        <div className="flex-1 overflow-y-auto overflow-x-auto bg-[#EFEFEF] p-3 sm:p-6">
          <div className="flex flex-col items-center gap-3 min-w-[595px]">
            {/* ════════════════ PÁGINA 1 ════════════════ */}
            <A4Page>
              <div className="flex flex-col gap-4 w-full">
                {/* Título + Data */}
                <div className="flex items-end justify-between pb-[1px]">
                  <span
                    className="text-[20px] text-black"
                    style={{
                      fontFamily: "Gotham, Inter, sans-serif",
                      fontWeight: 350,
                    }}
                  >
                    LAUDO MÉDICO
                  </span>
                  <span className="text-[12px] text-[#737373]">
                    Data: {today}
                  </span>
                </div>

                {/* Dados do paciente */}
                <div className="flex flex-col gap-[10.5px] w-full">
                  <SectionHeading>Dados do paciente</SectionHeading>
                  <div className="grid grid-cols-2 gap-y-[5.25px]">
                    {name && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[12px] font-semibold text-[#111111]">
                          Nome:
                        </span>
                        <span className="text-[12px] text-[#111111]">
                          {name}
                        </span>
                      </div>
                    )}
                    {birthDate && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[12px] font-semibold text-[#111111]">
                          Data de Nascimento:
                        </span>
                        <span className="text-[12px] text-[#111111]">
                          {birthDate}
                        </span>
                      </div>
                    )}
                    {rg && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[12px] font-semibold text-[#111111]">
                          RG:
                        </span>
                        <span className="text-[12px] text-[#111111]">{rg}</span>
                      </div>
                    )}
                    {cpf && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[12px] font-semibold text-[#111111]">
                          CPF:
                        </span>
                        <span className="text-[12px] text-[#111111]">
                          {cpf}
                        </span>
                      </div>
                    )}
                    {address && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[12px] font-semibold text-[#111111]">
                          Endereço:
                        </span>
                        <span className="text-[12px] text-[#111111]">
                          {address}
                        </span>
                      </div>
                    )}
                    {zipCode && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[12px] font-semibold text-[#111111]">
                          CEP:
                        </span>
                        <span className="text-[12px] text-[#111111]">
                          {zipCode}
                        </span>
                      </div>
                    )}
                    {phone && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[12px] font-semibold text-[#111111]">
                          Telefone:
                        </span>
                        <span className="text-[12px] text-[#111111]">
                          {phone}
                        </span>
                      </div>
                    )}
                    {healthPlan && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[12px] font-semibold text-[#111111]">
                          Convênio:
                        </span>
                        <span className="text-[12px] text-[#111111]">
                          {healthPlan}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Seções dinâmicas do laudo */}
                {sections.length > 0 ? (
                  sections.map((section) => (
                    <div
                      key={section.id}
                      className="flex flex-col gap-2 w-full"
                    >
                      <SectionHeading>{section.title}</SectionHeading>
                      {section.description ? (
                        <div
                          className="text-[12px] text-[#111111] leading-[1.333] prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(section.description),
                          }}
                        />
                      ) : (
                        <p className="text-[12px] text-[#111111] leading-[1.333]">
                          —
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col gap-2 w-full">
                    <SectionHeading>Histórico e diagnóstico</SectionHeading>
                    <p className="text-[12px] text-[#111111] leading-[1.333]">
                      —
                    </p>
                  </div>
                )}
              </div>
            </A4Page>

            {/* ════════════════ PÁGINA 2 ════════════════ */}
            <A4Page>
              <div className="flex flex-col gap-4 w-full">
                {/* Imagens de exame */}
                {examImages.length > 0 && (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="grid grid-cols-3 gap-2">
                      {examImages.map((doc) => (
                        <ExamImageItem key={doc.id} doc={doc} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Imagens placeholder quando não houver imagens */}
                {examImages.length === 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center justify-center aspect-square bg-white border border-dashed border-[#DCDFE3] rounded-xl"
                      >
                        <svg
                          className="w-10 h-10 text-[#DCDFE3]"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx="8.5"
                            cy="8.5"
                            r="1.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M21 15L16 10L5 21"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    ))}
                  </div>
                )}

                {/* Procedimento solicitado */}
                {procedures.length > 0 && (
                  <div className="flex flex-col gap-2 w-full">
                    <SectionHeading>Procedimento solicitado</SectionHeading>
                    <ProceduresTable procedures={procedures} />
                  </div>
                )}

                {/* Material solicitado */}
                {opmeItems.length > 0 && (
                  <div className="flex flex-col gap-2 w-full">
                    <SectionHeading>Material solicitado</SectionHeading>
                    <MaterialsTable opmeItems={opmeItems} />
                  </div>
                )}
              </div>
            </A4Page>

            {/* ════════════════ PÁGINA 3 ════════════════ */}
            <A4Page>
              <div className="flex flex-col gap-4 w-full flex-1">
                {/* Fabricantes e Fornecedores */}
                <div className="flex flex-col gap-4">
                  {fabricantes.length > 0 && (
                    <p className="text-[12px] text-black leading-[1.333]">
                      <span className="font-semibold">Fabricantes:</span>{" "}
                      {fabricantes.join(", ")}
                    </p>
                  )}
                  {fornecedores.length > 0 && (
                    <p className="text-[12px] text-black leading-[1.333]">
                      <span className="font-semibold">Fornecedores:</span>{" "}
                      {fornecedores.join(", ")}
                    </p>
                  )}
                </div>

                {/* Linha separadora */}
                {(fabricantes.length > 0 || fornecedores.length > 0) && (
                  <div className="w-full border-t border-[#DCDFE3]" />
                )}

                {/* Local */}
                {localText && (
                  <p className="text-[12px] text-black leading-[1.333]">
                    <span className="font-semibold">Local:</span> {localText}
                  </p>
                )}
                {doctorEmail && (
                  <p className="text-[12px] text-black leading-[1.333]">
                    <span className="font-semibold">E-mail:</span> {doctorEmail}
                  </p>
                )}
                {doctorPhone && (
                  <p className="text-[12px] text-black leading-[1.333]">
                    <span className="font-semibold">Tel:</span> {doctorPhone}
                  </p>
                )}

                {/* Texto de encerramento */}
                <p className="text-[12px] text-black leading-[1.333]">
                  Colocando-me a disposição para maiores informações,
                </p>

                {/* Assinatura */}
                <div
                  className="flex flex-col items-center gap-1 mt-4 mx-auto text-center"
                  style={{ maxWidth: "260px" }}
                >
                  {signatureUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={signatureUrl}
                      alt="Assinatura"
                      style={{
                        maxWidth: "120px",
                        maxHeight: "60px",
                        objectFit: "contain",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    />
                  )}
                  <div className="w-full border-t border-[#DCDFE3] mb-1" />
                  <span className="text-[12px] font-semibold text-[#111111] leading-[1.333]">
                    {doctorName || "___________________"}
                  </span>
                  {doctorSpecialty && (
                    <span className="text-[10px] text-[#111111] leading-[1.4]">
                      {doctorSpecialty}
                    </span>
                  )}
                  {doctorCRM && (
                    <span className="text-[10px] text-[#111111] leading-[1.4]">
                      {doctorCRM}
                    </span>
                  )}
                </div>
              </div>
            </A4Page>
          </div>
        </div>

        {/* Footer */}
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
