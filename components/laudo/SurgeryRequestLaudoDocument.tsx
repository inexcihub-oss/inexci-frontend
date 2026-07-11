"use client";

/**
 * SurgeryRequestLaudoDocument
 *
 * Renderiza o corpo do documento "Laudo Médico / Solicitação Cirúrgica" com
 * estilos inline que espelham exatamente o template HBS do backend
 * (surgery-request-laudo.hbs). É o componente compartilhado utilizado por:
 *
 *  - SurgeryRequestDocumentPreviewModal  (pré-visualização da solicitação)
 *  - MedicalReportPreviewModal           (pré-visualização do laudo)
 *
 * Qualquer alteração visual deve ser feita aqui apenas.
 */

import React from "react";
import {
  ReportSection,
  TussItemRef,
  OpmeItemRef,
} from "@/services/surgery-request.service";
import { sanitizeHtml } from "@/lib/sanitize-html";

// ─── Helpers (idênticos ao backend) ──────────────────────────────────────────

export function digitsOnly(v?: string | null): string {
  return v ? v.replace(/\D/g, "") : "";
}

export function formatCpf(v?: string): string {
  if (!v) return "";
  const d = digitsOnly(v).slice(0, 11);
  if (d.length !== 11) return v;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatPhone(v?: string): string {
  if (!v) return "";
  const d = digitsOnly(v).slice(0, 11);
  if (d.length === 11)
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v;
}

export function formatDateBR(v?: string): string {
  if (!v) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
  const match = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return v;
}

export function formatCep(v?: string): string {
  if (!v) return "";
  const d = digitsOnly(v).slice(0, 8);
  if (d.length !== 8) return "";
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export interface LaudoPatientSource {
  patient?: {
    name?: string | null;
    birthDate?: string | null;
    rg?: string | null;
    cpf?: string | null;
    phone?: string | null;
    healthPlanNumber?: string | null;
    address?: string | null;
    zipCode?: string | null;
    cep?: string | null;
  } | null;
  healthPlan?: { name?: string | null } | null;
  healthPlanName?: string | null;
  healthPlanRegistration?: string | null;
}

export interface LaudoPatientFields {
  patientName?: string;
  patientBirthDate?: string;
  patientRg?: string;
  patientCpf?: string;
  patientPhone?: string;
  patientAddress?: string;
  patientZipCode?: string;
  patientHealthPlan?: string;
  patientHealthPlanNumber?: string;
}

const filledString = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const filledCpf = (value?: string | null): string | undefined => {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length !== 11) return undefined;
  return formatCpf(digits);
};

const filledPhone = (value?: string | null): string | undefined => {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length < 10) return undefined;
  return formatPhone(digits);
};

const filledCep = (value?: string | null): string | undefined => {
  const digits = digitsOnly(value).slice(0, 8);
  if (digits.length !== 8) return undefined;
  return formatCep(digits);
};

const filledBirthDate = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const formatted = formatDateBR(value);
  return formatted || undefined;
};

export function buildLaudoPatientFields(
  source: LaudoPatientSource,
): LaudoPatientFields {
  const patient = source.patient;
  const fields: LaudoPatientFields = {};

  const patientName = filledString(patient?.name);
  if (patientName) fields.patientName = patientName;

  const patientBirthDate = filledBirthDate(patient?.birthDate ?? undefined);
  if (patientBirthDate) fields.patientBirthDate = patientBirthDate;

  const patientRg = filledString(patient?.rg);
  if (patientRg) fields.patientRg = patientRg;

  const patientCpf = filledCpf(patient?.cpf);
  if (patientCpf) fields.patientCpf = patientCpf;

  const patientAddress = filledString(patient?.address);
  if (patientAddress) fields.patientAddress = patientAddress;

  const patientZipCode = filledCep(patient?.zipCode ?? patient?.cep);
  if (patientZipCode) fields.patientZipCode = patientZipCode;

  const patientPhone = filledPhone(patient?.phone);
  if (patientPhone) fields.patientPhone = patientPhone;

  const patientHealthPlan = filledString(
    source.healthPlan?.name ?? source.healthPlanName,
  );
  if (patientHealthPlan) fields.patientHealthPlan = patientHealthPlan;

  const patientHealthPlanNumber =
    filledString(patient?.healthPlanNumber) ??
    filledString(source.healthPlanRegistration);
  if (patientHealthPlanNumber) {
    fields.patientHealthPlanNumber = patientHealthPlanNumber;
  }

  return fields;
}

const LAUDO_PATIENT_FIELD_LABELS: Record<keyof LaudoPatientFields, string> = {
  patientName: "Nome do paciente",
  patientBirthDate: "Data de nascimento",
  patientRg: "RG",
  patientCpf: "CPF",
  patientAddress: "Endereço",
  patientZipCode: "CEP",
  patientPhone: "Telefone",
  patientHealthPlan: "Convênio",
  patientHealthPlanNumber: "Número da carteirinha",
};

/** Rótulos curtos usados no PDF e na pré-visualização do documento. */
const LAUDO_DOCUMENT_PATIENT_FIELD_LABELS: Record<
  keyof LaudoPatientFields,
  string
> = {
  patientName: "Nome",
  patientBirthDate: "Data de Nascimento",
  patientRg: "RG",
  patientCpf: "CPF",
  patientAddress: "Endereço",
  patientZipCode: "CEP",
  patientPhone: "Telefone",
  patientHealthPlan: "Convênio",
  patientHealthPlanNumber: "Nº da carteirinha",
};

const LAUDO_PATIENT_FIELD_ORDER: (keyof LaudoPatientFields)[] = [
  "patientName",
  "patientBirthDate",
  "patientRg",
  "patientCpf",
  "patientPhone",
  "patientAddress",
  "patientZipCode",
  "patientHealthPlan",
  "patientHealthPlanNumber",
];

export function buildLaudoPatientDisplayFields(
  source: LaudoPatientSource,
): Array<{ label: string; value: string }> {
  const fields = buildLaudoPatientFields(source);

  return LAUDO_PATIENT_FIELD_ORDER.filter((key) => fields[key]).map((key) => ({
    label: LAUDO_PATIENT_FIELD_LABELS[key],
    value: fields[key]!,
  }));
}

export function buildLaudoDocumentPatientRows(
  fields: LaudoPatientFields,
): Array<{ label: string; value: string }> {
  return LAUDO_PATIENT_FIELD_ORDER.filter((key) => fields[key]).map((key) => ({
    label: LAUDO_DOCUMENT_PATIENT_FIELD_LABELS[key],
    value: fields[key]!,
  }));
}

export function chunkPatientDisplayRows<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

type DoctorSignatureSource =
  | {
      id?: string | number;
      signatureUrl?: string | null;
      doctorProfile?: { signatureUrl?: string | null } | null;
    }
  | null
  | undefined;

type AuthUserSignatureSource =
  | {
      id?: string | number;
      doctorProfile?: { signatureUrl?: string | null } | null;
    }
  | null
  | undefined;

export function resolveDoctorSignatureUrl(
  doctor: DoctorSignatureSource,
  currentUser?: AuthUserSignatureSource,
): string | null {
  const url =
    doctor?.signatureUrl ?? doctor?.doctorProfile?.signatureUrl ?? null;

  if (
    url ||
    !currentUser?.id ||
    !doctor?.id ||
    String(currentUser.id) !== String(doctor.id)
  ) {
    return url;
  }

  return currentUser.doctorProfile?.signatureUrl ?? null;
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

// ─── Sub-componentes internos ─────────────────────────────────────────────────

function PatientRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "4px",
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "#111111",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {label}:
      </span>
      <span
        style={{
          fontSize: "12px",
          fontWeight: 400,
          color: "#111111",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PatientFieldGrid({
  rows,
}: {
  rows: Array<Array<{ label: string; value: string }>>;
}) {
  if (!rows.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: "16px",
            alignItems: "start",
          }}
        >
          {row.map((field) => (
            <PatientRow
              key={`${rowIndex}-${field.label}`}
              label={field.label}
              value={field.value}
            />
          ))}
          {row.length === 1 ? <div aria-hidden="true" /> : null}
        </div>
      ))}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderBottom: "1px solid #e5e5e5",
        paddingBottom: "8px",
        marginBottom: "10px",
      }}
    >
      <span
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#171717",
          lineHeight: "1.14",
        }}
      >
        {children}
      </span>
    </div>
  );
}

function ProceduresTable({ procedures }: { procedures: TussItemRef[] }) {
  if (!procedures?.length) return null;
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        border: "1px solid #dcdfe3",
        fontSize: "12px",
        color: "#111111",
      }}
    >
      <thead>
        <tr>
          <th
            style={{
              width: "55%",
              fontWeight: 500,
              textAlign: "left",
              padding: "6px 10px",
              borderBottom: "1px solid #dcdfe3",
              borderRight: "1px solid #dcdfe3",
            }}
          >
            Procedimentos
          </th>
          <th
            style={{
              width: "30%",
              fontWeight: 500,
              textAlign: "left",
              padding: "6px 10px",
              borderBottom: "1px solid #dcdfe3",
              borderRight: "1px solid #dcdfe3",
            }}
          >
            TUSS
          </th>
          <th
            style={{
              width: "15%",
              fontWeight: 500,
              textAlign: "left",
              padding: "6px 10px",
              borderBottom: "1px solid #dcdfe3",
            }}
          >
            Quantidade
          </th>
        </tr>
      </thead>
      <tbody>
        {procedures.map((proc, idx) => {
          const bg = idx % 2 === 0 ? "#f2f2f2" : "#ffffff";
          return (
            <tr key={proc.id ?? idx}>
              <td
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #dcdfe3",
                  borderRight: "1px solid #dcdfe3",
                  lineHeight: "1.333",
                  background: bg,
                }}
              >
                {proc.name || "—"}
              </td>
              <td
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #dcdfe3",
                  borderRight: "1px solid #dcdfe3",
                  lineHeight: "1.333",
                  background: bg,
                }}
              >
                {proc.tussCode || "—"}
              </td>
              <td
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #dcdfe3",
                  lineHeight: "1.333",
                  background: bg,
                }}
              >
                {proc.quantity ?? 1}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MaterialsTable({ opmeItems }: { opmeItems: OpmeItemRef[] }) {
  if (!opmeItems?.length) return null;

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        border: "1px solid #dcdfe3",
        fontSize: "12px",
        color: "#111111",
      }}
    >
      <thead>
        <tr>
          <th
            style={{
              width: "50%",
              fontWeight: 500,
              textAlign: "left",
              padding: "6px 10px",
              borderBottom: "1px solid #dcdfe3",
              borderRight: "1px solid #dcdfe3",
            }}
          >
            Material
          </th>
          <th
            style={{
              width: "20%",
              fontWeight: 500,
              textAlign: "left",
              padding: "6px 10px",
              borderBottom: "1px solid #dcdfe3",
              borderRight: "1px solid #dcdfe3",
            }}
          >
            Fabricantes
          </th>
          <th
            style={{
              width: "20%",
              fontWeight: 500,
              textAlign: "left",
              padding: "6px 10px",
              borderBottom: "1px solid #dcdfe3",
              borderRight: "1px solid #dcdfe3",
            }}
          >
            Fornecedores
          </th>
          <th
            style={{
              width: "10%",
              fontWeight: 500,
              textAlign: "left",
              padding: "6px 10px",
              borderBottom: "1px solid #dcdfe3",
            }}
          >
            Quantidade
          </th>
        </tr>
      </thead>
      <tbody>
        {opmeItems.map((item, idx) => {
          const bg = idx % 2 === 0 ? "#f2f2f2" : "#ffffff";
          const fabricantes = unique(
            (item.manufacturers ?? [])
              .map((manufacturer) => manufacturer.name?.trim())
              .filter((name): name is string => Boolean(name)),
          ).join(", ");
          const fornecedores = unique(
            (item.suppliers ?? [])
              .map((supplier) => supplier.name?.trim())
              .filter((name): name is string => Boolean(name)),
          ).join(", ");

          return (
            <tr key={item.id ?? idx}>
              <td
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #dcdfe3",
                  borderRight: "1px solid #dcdfe3",
                  lineHeight: "1.333",
                  background: bg,
                }}
              >
                {item.name || "—"}
              </td>
              <td
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #dcdfe3",
                  borderRight: "1px solid #dcdfe3",
                  lineHeight: "1.333",
                  background: bg,
                }}
              >
                {fabricantes || "—"}
              </td>
              <td
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #dcdfe3",
                  borderRight: "1px solid #dcdfe3",
                  lineHeight: "1.333",
                  background: bg,
                }}
              >
                {fornecedores || "—"}
              </td>
              <td
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #dcdfe3",
                  lineHeight: "1.333",
                  background: bg,
                }}
              >
                {item.quantity ?? 1}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── ExamImageItem ────────────────────────────────────────────────────────────

function ExamImageItem({
  doc,
}: {
  doc: { id?: string; name?: string; uri: string };
}) {
  const [failed, setFailed] = React.useState(false);

  if (failed && doc.name) {
    return (
      <a
        href={doc.uri}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          aspectRatio: "1/1",
          padding: "8px",
          background: "#f9fafb",
          border: "1px dashed #e5e7eb",
          borderRadius: "12px",
          textDecoration: "none",
        }}
      >
        <svg
          style={{ width: "32px", height: "32px", color: "#d1d5db" }}
          viewBox="0 0 24 24"
          fill="none"
        >
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
        <span style={{ fontSize: "12px", color: "#0d9488", fontWeight: 500 }}>
          Abrir arquivo
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "#9ca3af",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
            textAlign: "center",
          }}
        >
          {doc.name}
        </span>
      </a>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={doc.uri}
      alt={doc.name ?? "Imagem do exame"}
      onError={() => setFailed(true)}
      style={{
        width: "100%",
        aspectRatio: "1/1",
        objectFit: "cover",
        border: "1px dashed #dcdfe3",
        borderRadius: "4px",
        display: "block",
      }}
    />
  );
}

// ─── Interface de props ───────────────────────────────────────────────────────

export interface SurgeryRequestLaudoDocumentProps {
  /** Data formatada (dd/mm/aaaa) exibida no cabeçalho */
  today: string;

  // — Dados do paciente —
  patientName?: string;
  patientBirthDate?: string;
  patientRg?: string;
  patientCpf?: string;
  patientPhone?: string;
  patientAddress?: string;
  patientZipCode?: string;
  patientHealthPlan?: string;
  patientHealthPlanNumber?: string;

  // — Conteúdo do laudo —
  /** Seções dinâmicas do laudo */
  sections: ReportSection[];

  // — Imagens de exame —
  examImages?: Array<{ id?: string; name?: string; uri: string }>;

  // — Procedimentos e OPME (somente na solicitação cirúrgica) —
  procedures?: TussItemRef[];
  opmeItems?: OpmeItemRef[];
  fabricantesText?: string;
  fornecedoresText?: string;

  // — Separador + local —
  hasSeparator?: boolean;
  localText?: string;

  // — Dados do médico —
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  doctorSpecialty?: string;
  doctorCrm?: string;
  /** URL da imagem de assinatura (já processada, se necessário) */
  doctorSignatureUrl?: string;
  /** Cabeçalho customizado do médico (substitui o cabeçalho padrão "LAUDO MÉDICO" quando presente) */
  customHeader?: {
    logoUrl?: string | null;
    logoPosition?: "left" | "center" | "right";
    contentHtml?: string | null;
  } | null;
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * Renderiza o corpo do documento A4 (sem chrome de modal).
 * Estilos inline garantem fidelidade ao PDF gerado pelo backend.
 */
export function SurgeryRequestLaudoDocument({
  today,
  patientName,
  patientBirthDate,
  patientRg,
  patientCpf,
  patientPhone,
  patientAddress,
  patientZipCode,
  patientHealthPlan,
  patientHealthPlanNumber,
  sections,
  examImages = [],
  procedures = [],
  opmeItems = [],
  fabricantesText = "",
  fornecedoresText = "",
  hasSeparator = false,
  localText = "",
  doctorName = "Médico",
  doctorSpecialty = "",
  doctorCrm = "",
  doctorSignatureUrl,
  customHeader,
}: SurgeryRequestLaudoDocumentProps) {
  const patientRows = chunkPatientDisplayRows(
    buildLaudoDocumentPatientRows({
      patientName,
      patientBirthDate,
      patientRg,
      patientCpf,
      patientPhone,
      patientAddress,
      patientZipCode,
      patientHealthPlan,
      patientHealthPlanNumber,
    }),
  );

  return (
    <div
      style={{
        background: "#ffffff",
        width: "100%",
        maxWidth: "595px",
        minHeight: "842px",
        margin: "0 auto",
        padding: "clamp(16px, 4vw, 32px)",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "12px",
        color: "#111111",
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
      }}
    >
      {/* ── Cabeçalho ── */}
      {customHeader ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: customHeader.logoUrl && customHeader.contentHtml ? "8px" : "0",
            marginBottom: "20px",
          }}
        >
          {customHeader.logoUrl && (
            <div
              style={{
                display: "flex",
                justifyContent:
                  customHeader.logoPosition === "right"
                    ? "flex-end"
                    : customHeader.logoPosition === "center"
                      ? "center"
                      : "flex-start",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={customHeader.logoUrl}
                alt="Logo"
                style={{
                  maxHeight: "80px",
                  maxWidth: "200px",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />
            </div>
          )}
          {customHeader.contentHtml && (
            <div
              style={{
                textAlign: "center",
                fontSize: "11px",
                lineHeight: "1.4",
                color: "#111",
              }}
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(customHeader.contentHtml),
              }}
            />
          )}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingBottom: "1px",
            marginBottom: "16px",
          }}
        >
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              color: "#000000",
              lineHeight: "1.3",
              margin: 0,
            }}
          >
            LAUDO MÉDICO
          </h1>
          <span
            style={{
              fontSize: "12px",
              color: "#737373",
              lineHeight: "1.17",
              whiteSpace: "nowrap",
            }}
          >
            Data: {today}
          </span>
        </div>
      )}

      {/* ── Dados do Paciente ── */}
      <div style={{ marginBottom: "16px" }}>
        <SectionHeading>Dados do paciente</SectionHeading>
        <PatientFieldGrid rows={patientRows} />
      </div>

      {/* ── Seções dinâmicas do laudo ── */}
      {sections.length > 0 &&
        sections.map((section) => (
          <div key={section.id} style={{ marginBottom: "16px" }}>
            <SectionHeading>
              <span
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(section.title),
                }}
              />
            </SectionHeading>
            {section.description ? (
              <div
                style={{
                  fontSize: "12px",
                  lineHeight: "1.333",
                  color: "#111111",
                  whiteSpace: "pre-line",
                }}
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(section.description),
                }}
              />
            ) : (
              <p
                style={{
                  fontSize: "12px",
                  lineHeight: "1.333",
                  color: "#111111",
                }}
              >
                —
              </p>
            )}
          </div>
        ))}

      {/* ── Imagens de Exame ── */}
      {examImages.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
            }}
          >
            {examImages.map((img, i) => (
              <ExamImageItem key={img.id ?? i} doc={img} />
            ))}
          </div>
        </div>
      )}

      {/* ── Procedimentos Solicitados ── */}
      {procedures.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <SectionHeading>Procedimento solicitado</SectionHeading>
          <ProceduresTable procedures={procedures} />
        </div>
      )}

      {/* ── Material Solicitado (OPME) ── */}
      {opmeItems.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <SectionHeading>Material solicitado</SectionHeading>
          <MaterialsTable opmeItems={opmeItems} />
        </div>
      )}

      {/* ── Fabricantes ── */}
      {fabricantesText && (
        <p
          style={{
            fontSize: "12px",
            color: "#000000",
            lineHeight: "1.333",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontWeight: 600 }}>Fabricantes:</span>{" "}
          {fabricantesText}
        </p>
      )}

      {/* ── Fornecedores ── */}
      {fornecedoresText && (
        <p
          style={{
            fontSize: "12px",
            color: "#000000",
            lineHeight: "1.333",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontWeight: 600 }}>Fornecedores:</span>{" "}
          {fornecedoresText}
        </p>
      )}

      {/* ── Separador ── */}
      {hasSeparator && (
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #dcdfe3",
            margin: "12px 0",
          }}
        />
      )}

      {/* ── Local ── */}
      {localText && (
        <p
          style={{
            fontSize: "12px",
            color: "#000000",
            lineHeight: "1.333",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontWeight: 600 }}>Local:</span> {localText}
        </p>
      )}

      {/* ── Encerramento ── */}
      <p
        style={{
          fontSize: "12px",
          color: "#000000",
          lineHeight: "1.333",
          marginBottom: "16px",
        }}
      >
        Colocando-me a disposição para maiores informações,
      </p>

      {/* ── Assinatura ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          marginTop: "32px",
          maxWidth: "260px",
          marginLeft: "auto",
          marginRight: "auto",
          textAlign: "center",
        }}
      >
        {doctorSignatureUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doctorSignatureUrl}
            alt="Assinatura do médico"
            style={{
              maxWidth: "120px",
              maxHeight: "60px",
              objectFit: "contain",
              display: "block",
              marginBottom: "4px",
            }}
          />
        )}
        <hr
          style={{
            width: "100%",
            border: "none",
            borderTop: "1px solid #dcdfe3",
            marginBottom: "4px",
          }}
        />
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#111111",
            lineHeight: "1.333",
          }}
        >
          {doctorName}
        </span>
        {doctorSpecialty && (
          <span
            style={{ fontSize: "10px", color: "#111111", lineHeight: "1.4" }}
          >
            {doctorSpecialty}
          </span>
        )}
        {doctorCrm && (
          <span
            style={{ fontSize: "10px", color: "#111111", lineHeight: "1.4" }}
          >
            {doctorCrm}
          </span>
        )}
      </div>
    </div>
  );
}
