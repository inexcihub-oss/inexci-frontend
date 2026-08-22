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
import { ClinicalDocumentActions } from "@/components/clinical/ClinicalDocumentActions";
import { ClinicalTemplateActions } from "@/components/clinical/ClinicalTemplateActions";
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
import { healthPlanService } from "@/services/health-plan.service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/http-error";
import { logger } from "@/lib/logger";
import { capitalizeFirst, formatCPF, formatPhone } from "@/lib/formatters";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Tag,
  Phone,
  IdCard,
  Lock,
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
 * A SC é criada best-effort depois de finalizar: quando a tentativa imediata
 * falha, a resposta vem sem `surgeryRequestId` e o backend retoma sozinho. A
 * mensagem precisa refletir o que de fato aconteceu.
 */
function finalizeMessage(record: ClinicalRecord): string {
  if (!record.surgicalIndication) return "Atendimento finalizado.";
  return record.surgeryRequestId
    ? "Atendimento finalizado. Solicitação cirúrgica criada."
    : "Atendimento finalizado. A solicitação cirúrgica está sendo criada.";
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
  const { isDoctor } = useAuth();
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
  const [documentsVersion, setDocumentsVersion] = useState(0);
  // O paciente guarda só o id do convênio; o nome vem do cadastro de convênios.
  // `healthPlanType` (Apartamento / Enfermaria) é a acomodação, não o plano —
  // era o que o card mostrava, sob o rótulo "Convênio".
  const [healthPlanName, setHealthPlanName] = useState<string | null>(null);

  useEffect(() => {
    const id = patient.healthPlanId;
    if (!id) {
      setHealthPlanName(null);
      return;
    }
    let active = true;
    healthPlanService
      .getById(id)
      .then((plan) => {
        if (active) setHealthPlanName(plan?.name ?? null);
      })
      .catch((err) => {
        logger.error("Erro ao carregar o convênio do paciente:", err);
        if (active) setHealthPlanName(null);
      });
    return () => {
      active = false;
    };
  }, [patient.healthPlanId]);

  const finalized = !!record?.finalizedAt;
  // Registrar o atendimento é ato do médico: secretária e assistente abrem a
  // tela pelo histórico, pelo cadastro e pelos exames, mas em leitura.
  const readOnly = finalized || !isDoctor;
  const isDirty =
    !readOnly && JSON.stringify(fields) !== JSON.stringify(baseline);

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
      surgicalIndication: fields.surgicalIndication,
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

  /**
   * Devolve o id da ficha para emitir um documento, persistindo antes o que
   * estiver pendente — o PDF é montado no servidor a partir da ficha gravada,
   * então um CID recém-digitado só entra no documento depois de salvo. Ficha
   * finalizada é imutável: não há o que salvar, só emitir.
   */
  const ensureRecordId = async (): Promise<string> => {
    if (record && (finalized || !isDirty)) return record.id;
    const saved = await persist();
    setRecord(saved);
    setBaseline(fields);
    return saved.id;
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
      // Registra a ficha assim que persistida, antes de chamar finalize():
      // se finalize() falhar (rede, timeout), o record local já aponta para
      // a ficha criada e uma nova tentativa vai atualizar, não duplicar.
      setRecord(saved);
      const done = await clinicalRecordService.finalize(saved.id);
      setRecord(done);
      setBaseline(fields);
      showSuccess(finalizeMessage(done));
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
            onClick={() => {
              if (
                isDirty &&
                !window.confirm(
                  "Há alterações não salvas no atendimento. Sair mesmo assim?",
                )
              )
                return;
              router.back();
            }}
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
            {/* Só a inicial em maiúscula: `capitalize` de CSS subia também as
                preposições ("Quarta-Feira, 05 De Agosto Às 14:00"). */}
            <p className="text-xs text-neutral-500 truncate">
              {capitalizeFirst(formatDateTime(appointment.scheduledAt))}
              {patientAge !== null && <span> · {patientAge} anos</span>}
            </p>
          </div>

          {!readOnly && (
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
          data-tour="ficha-abas"
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
                  value={healthPlanName || "—"}
                  hint={healthPlanName ? patient.healthPlanType : undefined}
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

              {!finalized && !isDoctor && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm">
                  <Lock className="w-5 h-5 shrink-0 text-neutral-400" />
                  <span>
                    Apenas médicos podem registrar o atendimento. Você está
                    vendo a ficha em modo leitura.
                  </span>
                </div>
              )}

              {!readOnly && (
                <ClinicalTemplateActions
                  doctorId={appointment.doctorId}
                  fields={fields}
                  onApply={(template) =>
                    setFields((prev) => ({
                      ...prev,
                      anamnesis: template.anamnesis ?? "",
                      physicalExam: template.physicalExam ?? "",
                      diagnosis: template.diagnosis ?? "",
                      conduct: template.conduct ?? "",
                      cidCodes: template.cidCodes ?? [],
                    }))
                  }
                />
              )}

              <AtendimentoFicha
                fields={fields}
                onFieldChange={handleFieldChange}
                readOnly={readOnly}
                surgeryRequestId={record?.surgeryRequestId ?? null}
              />

              {/* Receita, atestado e pedido de exame saem com o CRM e a
                  assinatura do médico da consulta — só ele emite. */}
              {isDoctor && (
                <ClinicalDocumentActions
                  ensureRecordId={ensureRecordId}
                  cidCodes={fields.cidCodes}
                  patientId={patient.id}
                  doctorId={appointment.doctorId}
                  onEmitted={(document) => {
                    showSuccess(`${document.name} emitido.`);
                    // A aba Documentos já pode estar montada — sem isto, o
                    // documento recém-emitido só apareceria ao recarregar.
                    setDocumentsVersion((v) => v + 1);
                  }}
                />
              )}

              {!readOnly && (
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
                refreshKey={documentsVersion}
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
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  /** Complemento secundário (ex.: a acomodação, ao lado do convênio). */
  hint?: string;
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
          {hint && (
            <span className="text-neutral-400 font-normal"> · {hint}</span>
          )}
        </p>
      </div>
    </div>
  );
}
