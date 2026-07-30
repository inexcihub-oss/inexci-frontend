"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { CidPicker } from "@/components/clinical/CidPicker";
import { PatientDocuments } from "@/components/clinical/PatientDocuments";
import {
  Appointment,
  APPOINTMENT_TYPE_LABELS,
} from "@/services/appointment.service";
import { Patient } from "@/services/patient.service";
import {
  clinicalRecordService,
  ClinicalRecord,
  ClinicalCidCode,
} from "@/services/clinical-record.service";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/http-error";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { formatCPF, formatPhone } from "@/lib/formatters";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Stethoscope,
  Activity,
  ClipboardCheck,
  Tag,
  Phone,
  IdCard,
  ShieldCheck,
  FolderOpen,
} from "lucide-react";

const RichTextEditor = dynamic(
  () =>
    import("@/components/shared/RichTextEditor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="ds-textarea opacity-50" /> },
);

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

interface FieldState {
  anamnesis: string;
  physicalExam: string;
  diagnosis: string;
  conduct: string;
  cidCodes: ClinicalCidCode[];
}

function fieldsFrom(record: ClinicalRecord | null): FieldState {
  return {
    anamnesis: record?.anamnesis ?? "",
    physicalExam: record?.physicalExam ?? "",
    diagnosis: record?.diagnosis ?? "",
    conduct: record?.conduct ?? "",
    cidCodes: record?.cidCodes ?? [],
  };
}

/**
 * Ficha de atendimento clínico de uma consulta. Todo atendimento nasce de uma
 * consulta agendada — o acesso é sempre via agenda ou pela ficha do paciente.
 */
export function AtendimentoFicha({
  patient,
  appointment,
  initialRecord,
}: {
  patient: Patient;
  appointment: Appointment;
  initialRecord: ClinicalRecord | null;
}) {
  const router = useRouter();
  const { toast, showSuccess, showError, hideToast } = useToast();

  const [record, setRecord] = useState<ClinicalRecord | null>(initialRecord);
  const [fields, setFields] = useState<FieldState>(fieldsFrom(initialRecord));
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const finalized = !!record?.finalizedAt;

  const setField = <K extends keyof FieldState>(key: K, value: FieldState[K]) =>
    setFields((f) => ({ ...f, [key]: value }));

  const persist = async (): Promise<ClinicalRecord> => {
    if (record) {
      return clinicalRecordService.update(record.id, {
        anamnesis: fields.anamnesis,
        physicalExam: fields.physicalExam,
        diagnosis: fields.diagnosis,
        conduct: fields.conduct,
        cidCodes: fields.cidCodes,
      });
    }
    return clinicalRecordService.create({
      patientId: patient.id,
      doctorId: appointment.doctorId,
      appointmentId: appointment.id,
      anamnesis: fields.anamnesis,
      physicalExam: fields.physicalExam,
      diagnosis: fields.diagnosis,
      conduct: fields.conduct,
      cidCodes: fields.cidCodes,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await persist();
      setRecord(saved);
      showSuccess("Atendimento salvo.");
    } catch (err) {
      showError(getApiErrorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      const saved = await persist();
      const done = await clinicalRecordService.finalize(saved.id);
      setRecord(done);
      showSuccess("Atendimento finalizado.");
    } catch (err) {
      showError(getApiErrorMessage(err, "Não foi possível finalizar."));
    } finally {
      setFinalizing(false);
    }
  };

  const patientAge = useMemo(() => {
    if (!patient.birthDate) return null;
    const b = new Date(patient.birthDate);
    return Math.floor((Date.now() - b.getTime()) / (365.25 * 24 * 3600 * 1000));
  }, [patient.birthDate]);

  const subtitle = formatDateTime(appointment.scheduledAt);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header fixo ───────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-neutral-100 bg-white">
        <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition-colors shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>

          <div className="w-11 h-11 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {initials(patient.name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base lg:text-lg font-bold text-neutral-900 truncate">
                {patient.name}
              </h1>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
                <Tag className="w-3 h-3" />
                {APPOINTMENT_TYPE_LABELS[appointment.type]}
              </span>
              {finalized && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Finalizado
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 capitalize truncate">
              {subtitle}
              {patientAge !== null && (
                <span className="normal-case"> · {patientAge} anos</span>
              )}
            </p>
          </div>

          {!finalized && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={handleSave}
                isLoading={saving}
                disabled={finalizing}
                className="rounded-xl"
              >
                Salvar rascunho
              </Button>
              <Button
                onClick={handleFinalize}
                isLoading={finalizing}
                disabled={saving}
                className="rounded-xl"
              >
                Finalizar
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* ── Corpo rolável ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ContextItem
              icon={<Phone className="w-4 h-4" />}
              label="Telefone"
              value={patient.phone ? formatPhone(patient.phone) : "—"}
            />
            <ContextItem
              icon={<IdCard className="w-4 h-4" />}
              label="CPF"
              value={patient.cpf ? formatCPF(patient.cpf) : "—"}
            />
            <ContextItem
              icon={<ShieldCheck className="w-4 h-4" />}
              label="Convênio"
              value={patient.healthPlanType || "—"}
            />
            <ContextItem
              icon={<IdCard className="w-4 h-4" />}
              label="Carteirinha"
              value={patient.healthPlanNumber || "—"}
            />
          </div>

          {finalized && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                Atendimento finalizado em{" "}
                {record?.finalizedAt ? formatDateTime(record.finalizedAt) : ""}.
                O registro é somente leitura.
              </span>
            </div>
          )}

          <SectionCard
            icon={<ClipboardList className="w-4 h-4" />}
            title="Anamnese"
          >
            <EditorField
              value={fields.anamnesis}
              onChange={(v) => setField("anamnesis", v)}
              readOnly={finalized}
              placeholder="Queixa principal, história da doença atual, antecedentes..."
            />
          </SectionCard>

          <SectionCard
            icon={<Stethoscope className="w-4 h-4" />}
            title="Exame físico"
          >
            <EditorField
              value={fields.physicalExam}
              onChange={(v) => setField("physicalExam", v)}
              readOnly={finalized}
              placeholder="Achados do exame físico..."
            />
          </SectionCard>

          <SectionCard
            icon={<Activity className="w-4 h-4" />}
            title="Diagnóstico / Hipótese"
          >
            <EditorField
              value={fields.diagnosis}
              onChange={(v) => setField("diagnosis", v)}
              readOnly={finalized}
              placeholder="Diagnóstico ou hipótese diagnóstica..."
            />
            <div className="mt-3">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                CID-10
              </p>
              <CidPicker
                value={fields.cidCodes}
                onChange={(v) => setField("cidCodes", v)}
                disabled={finalized}
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={<ClipboardCheck className="w-4 h-4" />}
            title="Conduta / Plano"
          >
            <EditorField
              value={fields.conduct}
              onChange={(v) => setField("conduct", v)}
              readOnly={finalized}
              placeholder="Conduta, prescrição, orientações, retorno..."
            />
          </SectionCard>

          <SectionCard
            icon={<FolderOpen className="w-4 h-4" />}
            title="Documentos / Exames"
          >
            <PatientDocuments
              patientId={patient.id}
              clinicalRecordId={record?.id}
            />
          </SectionCard>

          {!finalized && (
            <div className="sm:hidden flex flex-col-reverse gap-3 pt-1 pb-4">
              <Button
                variant="outline"
                onClick={handleSave}
                isLoading={saving}
                disabled={finalizing}
                className="min-h-[44px] rounded-xl"
              >
                Salvar rascunho
              </Button>
              <Button
                onClick={handleFinalize}
                isLoading={finalizing}
                disabled={saving}
                className="min-h-[44px] rounded-xl"
              >
                Finalizar atendimento
              </Button>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}

function ContextItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-neutral-100 bg-white px-3 py-2.5 shadow-sm">
      <span className="w-8 h-8 rounded-lg bg-neutral-50 text-neutral-500 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-neutral-400 leading-none mb-1">
          {label}
        </p>
        <p className="text-sm font-medium text-neutral-800 truncate leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100">
        <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EditorField({
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  if (readOnly) {
    return (
      <div
        className="prose prose-sm max-w-none rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 min-h-[60px]"
        dangerouslySetInnerHTML={{
          __html: value
            ? sanitizeHtml(value)
            : "<p class='text-neutral-400'>Não preenchido.</p>",
        }}
      />
    );
  }
  return (
    <RichTextEditor value={value} onChange={onChange} placeholder={placeholder} />
  );
}
