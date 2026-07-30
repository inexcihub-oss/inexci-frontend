"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import {
  AtendimentoFicha,
  FichaFields,
  fichaFieldsFrom,
} from "@/components/clinical/AtendimentoFicha";
import { PatientHistoryTab } from "@/components/clinical/PatientHistoryTab";
import { PatientDocuments } from "@/components/clinical/PatientDocuments";
import { PatientRegistrationForm } from "@/components/patients/PatientRegistrationForm";
import {
  Appointment,
  APPOINTMENT_TYPE_LABELS,
} from "@/services/appointment.service";
import { Patient } from "@/services/patient.service";
import {
  clinicalRecordService,
  ClinicalRecord,
} from "@/services/clinical-record.service";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/http-error";
import { formatCPF, formatPhone } from "@/lib/formatters";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Tag,
  Phone,
  IdCard,
  ShieldCheck,
} from "lucide-react";

export type AtendimentoTabId =
  | "atendimento"
  | "historico"
  | "cadastro"
  | "documentos";

const TABS: Array<{ id: AtendimentoTabId; label: string }> = [
  { id: "atendimento", label: "Atendimento" },
  { id: "historico", label: "Histórico" },
  { id: "cadastro", label: "Cadastro" },
  { id: "documentos", label: "Documentos" },
];

const TAB_IDS = TABS.map((t) => t.id);

function isTabId(value: string | null): value is AtendimentoTabId {
  return !!value && (TAB_IDS as string[]).includes(value);
}

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

/**
 * Casca da tela de atendimento: header fixo, barra de abas e o conteúdo ativo.
 * É a dona do estado da ficha (por isso trocar de aba nunca perde o que foi
 * digitado) e das ações de salvar/finalizar. Nada é enviado ao servidor sem
 * ação explícita do médico — não há autosave, para não criar fichas "em
 * aberto" em atendimentos abandonados.
 */
export function AtendimentoTabs({
  patient: initialPatient,
  appointment,
  initialRecord,
}: {
  patient: Patient;
  appointment: Appointment;
  initialRecord: ClinicalRecord | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, showSuccess, showError, hideToast } = useToast();

  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<AtendimentoTabId>(
    isTabId(tabFromUrl) ? tabFromUrl : "atendimento",
  );
  // Abas já abertas: o conteúdo pesado (histórico, documentos) só monta na
  // primeira visita e permanece montado depois.
  const [visited, setVisited] = useState<Set<AtendimentoTabId>>(
    () => new Set<AtendimentoTabId>([isTabId(tabFromUrl) ? tabFromUrl : "atendimento"]),
  );

  const [patient, setPatient] = useState<Patient>(initialPatient);
  const [record, setRecord] = useState<ClinicalRecord | null>(initialRecord);
  const [fields, setFields] = useState<FichaFields>(() =>
    fichaFieldsFrom(initialRecord),
  );
  const [baseline, setBaseline] = useState<FichaFields>(() =>
    fichaFieldsFrom(initialRecord),
  );
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const finalized = !!record?.finalizedAt;
  const isDirty =
    !finalized && JSON.stringify(fields) !== JSON.stringify(baseline);

  // Aviso do navegador ao fechar/recarregar com alterações pendentes.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const goToTab = (tab: AtendimentoTabId) => {
    setActiveTab(tab);
    setVisited((prev) => new Set(prev).add(tab));
    router.replace(`?tab=${tab}`, { scroll: false });
  };

  const handleFieldChange = <K extends keyof FichaFields>(
    key: K,
    value: FichaFields[K],
  ) => setFields((prev) => ({ ...prev, [key]: value }));

  const persist = async (): Promise<ClinicalRecord> => {
    const payload = {
      anamnesis: fields.anamnesis,
      physicalExam: fields.physicalExam,
      diagnosis: fields.diagnosis,
      conduct: fields.conduct,
      cidCodes: fields.cidCodes,
    };
    if (record) {
      return clinicalRecordService.update(record.id, payload);
    }
    return clinicalRecordService.create({
      patientId: patient.id,
      doctorId: appointment.doctorId,
      appointmentId: appointment.id,
      ...payload,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await persist();
      setRecord(saved);
      setBaseline(fields);
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
      setBaseline(fields);
      showSuccess("Atendimento finalizado.");
    } catch (err) {
      showError(getApiErrorMessage(err, "Não foi possível finalizar."));
    } finally {
      setFinalizing(false);
    }
  };

  const patientAge = useMemo(() => {
    if (!patient.birthDate) return null;
    const birth = new Date(patient.birthDate);
    return Math.floor(
      (Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000),
    );
  }, [patient.birthDate]);

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
              {isDirty && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  <Circle className="w-2.5 h-2.5 fill-current" />
                  Alterações não salvas
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 capitalize truncate">
              {formatDateTime(appointment.scheduledAt)}
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

        {/* ── Barra de abas ───────────────────────────────────────── */}
        <div
          role="tablist"
          aria-label="Seções do atendimento"
          className="flex items-center px-4 lg:px-6 overflow-x-auto scrollbar-hide"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => goToTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] -mb-px ${
                activeTab === tab.id
                  ? "text-black border-b-[3px] border-teal-700"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Corpo rolável ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-5">
          {/* A ficha permanece montada (apenas oculta) para não reinicializar
              o editor e não perder o histórico de digitação. */}
          <div className={activeTab === "atendimento" ? "" : "hidden"}>
            <div className="flex flex-col gap-4">
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
                    {record?.finalizedAt
                      ? formatDateTime(record.finalizedAt)
                      : ""}
                    . O registro é somente leitura.
                  </span>
                </div>
              )}

              <AtendimentoFicha
                fields={fields}
                onFieldChange={handleFieldChange}
                readOnly={finalized}
              />

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

          {visited.has("historico") && (
            <div className={activeTab === "historico" ? "" : "hidden"}>
              <PatientHistoryTab
                patientId={patient.id}
                currentAppointmentId={appointment.id}
              />
            </div>
          )}

          {visited.has("cadastro") && (
            <div className={activeTab === "cadastro" ? "" : "hidden"}>
              <PatientRegistrationForm
                patient={patient}
                onSaved={(saved) => {
                  setPatient(saved);
                  showSuccess("Dados do paciente atualizados.");
                }}
              />
            </div>
          )}

          {visited.has("documentos") && (
            <div className={activeTab === "documentos" ? "" : "hidden"}>
              <PatientDocuments
                patientId={patient.id}
                clinicalRecordId={record?.id}
              />
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
