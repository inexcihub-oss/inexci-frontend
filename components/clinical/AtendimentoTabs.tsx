"use client";

import Image from "next/image";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { Permission } from "@/lib/permissions";
import {
  AtendimentoFicha,
  FICHA_SECOES,
  FichaFields,
  FichaIndice,
  type FerramentasDeTexto,
  type FichaTextKey,
  ModoFichaToggle,
  fichaFieldsFrom,
  useSecoesDaFicha,
} from "@/components/clinical/AtendimentoFicha";
import { useModoFicha } from "@/hooks/useModoFicha";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Modal } from "@/components/ui/Modal";
import { anexarHtml, FichaAnterior } from "@/components/clinical/FichaAnterior";
import { SalvarTextoRapidoModal } from "@/components/clinical/SalvarTextoRapidoModal";
import { useClinicalSnippets } from "@/hooks/useClinicalSnippets";
import { ditadoHabilitado } from "@/lib/ditado";
import { clinicalSnippetService } from "@/services/clinical-snippet.service";
import { PatientHistoryTab } from "@/components/clinical/PatientHistoryTab";
import {
  AssinanteConsulta,
  ClinicalDocumentActions,
} from "@/components/clinical/ClinicalDocumentActions";
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
import { useHealthPlan } from "@/hooks/useHealthPlans";
import { useAvailableDoctors } from "@/hooks/useAvailableDoctors";
import { emiteDocumentosClinicos } from "@/lib/professional-council";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { TOUR_DEMO_APPOINTMENT_ID } from "@/lib/onboarding/demo-data";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/http-error";
import { appointmentKeys } from "@/lib/query-keys";
import { capitalizeFirst, formatCPF, formatPhone } from "@/lib/formatters";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  History,
  Loader2,
  Tag,
  X,
  Phone,
  IdCard,
  Lock,
  ShieldCheck,
  Trash2,
} from "lucide-react";

export type AtendimentoTabId =
  "atendimento" | "historico" | "cadastro" | "documentos";

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

const INDICACAO_SO_MEDICO = "Indicação cirúrgica é ato de médico (CRM).";

export const AUTOSAVE_DELAY_MS = 2500;

type SaveStatus = "idle" | "saving" | "saved" | "error";

function formatHoraSalvo(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
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

function finalizeMessage(record: ClinicalRecord): string {
  if (!record.surgicalIndication) return "Atendimento finalizado.";
  return record.surgeryRequestId
    ? "Atendimento finalizado. Solicitação cirúrgica criada."
    : "Atendimento finalizado. A solicitação cirúrgica está sendo criada.";
}

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
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { user, isDoctor, isPhysician, canIssueClinicalDocuments, can } =
    useAuth();
  const { showSuccess, showError } = useToast();
  const { emTour } = useOnboarding();
  const dadosFabricados = appointment.id === TOUR_DEMO_APPOINTMENT_ID;
  const bloqueado = emTour || dadosFabricados;

  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<AtendimentoTabId>(
    isTabId(tabFromUrl) ? tabFromUrl : "atendimento",
  );
  const [visited, setVisited] = useState<Set<AtendimentoTabId>>(
    () =>
      new Set<AtendimentoTabId>([
        isTabId(tabFromUrl) ? tabFromUrl : "atendimento",
      ]),
  );

  const [patient, setPatient] = useState<Patient>(initialPatient);
  const { data: availableDoctors } = useAvailableDoctors({ fresh: true });
  const assinante = useMemo<AssinanteConsulta | null>(() => {
    const d = availableDoctors?.find((x) => x.id === appointment.doctorId);
    if (!d) return null;
    return {
      nome: d.name,
      medico: d.isPhysician !== false,
      emiteDocumentos:
        d.canIssueClinicalDocuments ??
        (d.council ? emiteDocumentosClinicos(d) : d.isPhysician !== false),
      conselho: d.council ?? "CRM",
      semNumero: !d.crm?.trim() || !d.crmState?.trim(),
    };
  }, [availableDoctors, appointment.doctorId]);
  const consultaDeMedico = assinante?.medico !== false;
  const ehProfissionalDaConsulta =
    !!user?.id && user.id === appointment.doctorId;
  const crmSemNumeroDe =
    assinante?.medico && assinante.semNumero ? assinante.nome : null;
  const [record, setRecord] = useState<ClinicalRecord | null>(initialRecord);
  const [fields, setFields] = useState<FichaFields>(() =>
    fichaFieldsFrom(initialRecord),
  );
  const [baseline, setBaseline] = useState<FichaFields>(() =>
    fichaFieldsFrom(initialRecord),
  );
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(() =>
    initialRecord?.updatedAt ? new Date(initialRecord.updatedAt) : null,
  );
  const recordRef = useRef<ClinicalRecord | null>(initialRecord);
  const baselineRef = useRef<FichaFields>(baseline);
  const lastPersistedRef = useRef<string | null>(
    initialRecord ? JSON.stringify(fichaFieldsFrom(initialRecord)) : null,
  );
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const [finalizing, setFinalizing] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [documentsVersion, setDocumentsVersion] = useState(0);
  const { healthPlan } = useHealthPlan(patient.healthPlanId);
  const healthPlanName = healthPlan?.name ?? null;

  const finalized = !!record?.finalizedAt;
  const readOnly = finalized || !isDoctor;
  const isDirty =
    !readOnly && JSON.stringify(fields) !== JSON.stringify(baseline);
  const autosaveEnabled =
    !readOnly && !bloqueado && !finalizing && !excluindo;

  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);

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
    if (tab !== activeTab) flushAutosave();
    setActiveTab(tab);
    setVisited((prev) => new Set(prev).add(tab));
    router.replace(`?tab=${tab}`, { scroll: false });
  };

  const handleFieldChange = <K extends keyof FichaFields>(
    key: K,
    value: FichaFields[K],
  ) => setFields((prev) => ({ ...prev, [key]: value }));

  const persist = (
    snapshot: FichaFields,
    { skipIfUnchanged = false }: { skipIfUnchanged?: boolean } = {},
  ): Promise<ClinicalRecord> => {
    const run = async () => {
      const current = recordRef.current;
      const serialized = JSON.stringify(snapshot);
      if (skipIfUnchanged && current && lastPersistedRef.current === serialized)
        return current;
      const payload = {
        anamnesis: snapshot.anamnesis,
        physicalExam: snapshot.physicalExam,
        diagnosis: snapshot.diagnosis,
        conduct: snapshot.conduct,
        cidCodes: snapshot.cidCodes,
        ...(snapshot.surgicalIndication !==
        baselineRef.current.surgicalIndication
          ? { surgicalIndication: snapshot.surgicalIndication }
          : {}),
        procedureId: snapshot.procedureId,
      };
      const saved = current
        ? await clinicalRecordService.update(current.id, payload)
        : await clinicalRecordService.create({
            patientId: patient.id,
            doctorId: appointment.doctorId,
            appointmentId: appointment.id,
            ...payload,
          });
      recordRef.current = saved;
      lastPersistedRef.current = serialized;
      return saved;
    };
    const next = saveQueue.current.then(run, run);
    saveQueue.current = next.catch(() => undefined);
    return next;
  };

  const marcarSalvo = (saved: ClinicalRecord, snapshot: FichaFields) => {
    setRecord(saved);
    setBaseline(snapshot);
    setSavedAt(new Date());
    setSaveStatus("saved");
  };

  const autoSave = async (snapshot: FichaFields) => {
    setSaveStatus("saving");
    try {
      const saved = await persist(snapshot, { skipIfUnchanged: true });
      marcarSalvo(saved, snapshot);
    } catch {
      setSaveStatus("error");
    }
  };

  const flushAutosave = () => {
    if (autosaveEnabled && isDirty) void autoSave(fields);
  };

  useEffect(() => {
    if (!autosaveEnabled || !isDirty) return;
    const timer = setTimeout(() => void autoSave(fields), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, autosaveEnabled, isDirty]);

  const flushRef = useRef(flushAutosave);
  useEffect(() => {
    flushRef.current = flushAutosave;
  });
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "hidden") flushRef.current();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const ensureRecordId = async (): Promise<string> => {
    if (record && (finalized || !isDirty)) return record.id;
    const saved = await persist(fields);
    marcarSalvo(saved, fields);
    return saved.id;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await persist(fields);
      marcarSalvo(saved, fields);
      showSuccess("Atendimento salvo.");
    } catch (err) {
      showError(getApiErrorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (fields.surgicalIndication && !consultaDeMedico) {
      showError(
        `${assinante?.nome ?? "O profissional da consulta"} não é médico e não pode indicar cirurgia. Desmarque "Paciente cirúrgico" para finalizar.`,
      );
      return;
    }
    if (fields.surgicalIndication && !isPhysician) {
      showError(INDICACAO_SO_MEDICO);
      return;
    }
    if (fields.surgicalIndication && crmSemNumeroDe) {
      showError(
        `Preencha o número e a UF do CRM de ${crmSemNumeroDe} em Colaboradores ou desmarque "Paciente cirúrgico" para finalizar.`,
      );
      return;
    }
    setFinalizing(true);
    try {
      const saved = await persist(fields);
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

  const handleDeleteDraft = async () => {
    if (!record) return;
    setExcluindo(true);
    try {
      await clinicalRecordService.delete(record.id);
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      setConfirmarExclusao(false);
      setBaseline(fields);
      router.push(can(Permission.AGENDA) ? "/agenda" : "/atendimento");
    } catch (err) {
      setConfirmarExclusao(false);
      showError(
        getApiErrorMessage(err, "Não foi possível excluir o rascunho."),
      );
    } finally {
      setExcluindo(false);
    }
  };
  const podeExcluirRascunho = !!record && !finalized && isDoctor && !bloqueado;
  const allowSurgicalIndication = isPhysician && consultaDeMedico;
  const { modo, setModo } = useModoFicha(user?.id);
  const secoes = useSecoesDaFicha(fields, modo, readOnly);
  const [fichaAnteriorAberta, setFichaAnteriorAberta] = useState(false);
  const [trechoParaSalvar, setTrechoParaSalvar] = useState<string | null>(
    null,
  );
  const { data: snippets } = useClinicalSnippets(
    appointment.doctorId,
    !readOnly && !bloqueado,
  );
  const ferramentas: FerramentasDeTexto | undefined =
    readOnly || bloqueado
      ? undefined
      : {
          snippets: snippets ?? [],
          onSnippetUsed: (id) => {
            void clinicalSnippetService.registerUse(id).catch(() => undefined);
          },
          onSaveSelection: setTrechoParaSalvar,
          transcrever: ditadoHabilitado()
            ? clinicalRecordService.transcribe
            : undefined,
        };
  const telaLarga = useMediaQuery("(min-width: 1280px)");
  const painelLateral = fichaAnteriorAberta && telaLarga && !readOnly;

  const copiarDaFichaAnterior = (key: FichaTextKey, html: string) => {
    const destino: FichaTextKey = modo === "livre" ? "anamnesis" : key;
    const tituloOrigem =
      FICHA_SECOES.find((secao) => secao.key === key)?.title ?? "";
    const conteudo =
      modo === "livre" && key !== "anamnesis"
        ? `<p><strong>${tituloOrigem}:</strong></p>${html}`
        : html;
    setFields((prev) => ({
      ...prev,
      [destino]: anexarHtml(prev[destino], conteudo),
    }));
    const tituloDestino =
      secoes.find((secao) => secao.key === destino)?.title ?? tituloOrigem;
    showSuccess(`Copiado para ${tituloDestino}.`);
  };

  const copiarCidsDaFichaAnterior = (
    cids: NonNullable<ClinicalRecord["cidCodes"]>,
  ) => {
    setFields((prev) => ({
      ...prev,
      cidCodes: [
        ...prev.cidCodes,
        ...cids.filter(
          (cid) => !prev.cidCodes.some((atual) => atual.code === cid.code),
        ),
      ],
    }));
    showSuccess("CID-10 copiado.");
  };

  const fichaAnterior = (
    <FichaAnterior
      patientId={patient.id}
      appointmentId={appointment.id}
      currentRecordId={record?.id ?? null}
      onCopiar={copiarDaFichaAnterior}
      onCopiarCids={copiarCidsDaFichaAnterior}
    />
  );
  const mostrarIndicacao =
    allowSurgicalIndication ||
    fields.surgicalIndication ||
    baseline.surgicalIndication;

  const patientAge = useMemo(() => {
    if (!patient.birthDate) return null;
    const birth = new Date(patient.birthDate);
    return Math.floor(
      (Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000),
    );
  }, [patient.birthDate]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
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

          {patient.photoUrl ? (
            <Image
              src={patient.photoUrl}
              alt={`Foto de ${patient.name}`}
              width={44}
              height={44}
              unoptimized
              className="w-11 h-11 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {initials(patient.name)}
            </div>
          )}

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
              {!readOnly && (
                <SaveStatusIndicator
                  status={saveStatus}
                  dirty={isDirty}
                  savedAt={savedAt}
                  onRetry={() => void autoSave(fields)}
                />
              )}
            </div>
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
                disabled={finalizing || bloqueado}
                className="rounded-xl"
              >
                Salvar rascunho
              </Button>
              <Button
                onClick={handleFinalize}
                isLoading={finalizing}
                disabled={saving || bloqueado}
                className="rounded-xl"
              >
                Finalizar
              </Button>
            </div>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Seções do atendimento"
          data-tour="ficha-abas"
          className="flex items-center px-4 lg:px-6 overflow-x-auto scrollbar-hide"
        >
          {TABS.map((tab) => {
            const bloqueadaNoTour = bloqueado && tab.id !== "atendimento";
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                disabled={bloqueadaNoTour}
                onClick={() => goToTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] -mb-px disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeTab === tab.id
                    ? "text-black border-b-[3px] border-teal-700"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-white">
        <div
          className={`${activeTab === "atendimento" ? "max-w-6xl" : "max-w-4xl"} mx-auto px-4 lg:px-6 py-5`}
        >
          <div
            className={
              activeTab === "atendimento"
                ? painelLateral
                  ? "lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8"
                  : "lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8"
                : "hidden"
            }
          >
            <aside className={painelLateral ? "hidden" : "hidden lg:block"}>
              <div className="sticky top-0 flex flex-col gap-5">
                <FichaIndice
                  fields={fields}
                  mostrarIndicacao={mostrarIndicacao}
                  orientation="vertical"
                  secoes={secoes}
                />
                {!readOnly && (
                  <p className="px-2.5 text-xs text-neutral-500">
                    Tudo é salvo automaticamente enquanto você escreve.
                  </p>
                )}
              </div>
            </aside>
            <div className="flex flex-col gap-4 min-w-0">
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

              <div className="lg:hidden">
                <FichaIndice
                  fields={fields}
                  mostrarIndicacao={mostrarIndicacao}
                  orientation="horizontal"
                  secoes={secoes}
                />
              </div>

              {!readOnly && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ModoFichaToggle modo={modo} onChange={setModo} />
                    <button
                      type="button"
                      onClick={() => setFichaAnteriorAberta((v) => !v)}
                      aria-expanded={fichaAnteriorAberta}
                      className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors ${
                        fichaAnteriorAberta
                          ? "border-teal-200 bg-teal-50 text-teal-800"
                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <History className="w-4 h-4" aria-hidden="true" />
                      Ficha anterior
                    </button>
                  </div>
                  {modo === "livre" && (
                    <p className="text-xs text-neutral-500">
                      Tudo num campo só. CID e indicação cirúrgica continuam
                      abaixo.
                    </p>
                  )}
                </div>
              )}

              <AtendimentoFicha
                secoes={secoes}
                ferramentas={ferramentas}
                fields={fields}
                onFieldChange={handleFieldChange}
                readOnly={readOnly}
                surgeryRequestId={record?.surgeryRequestId ?? null}
                allowSurgicalIndication={allowSurgicalIndication}
                keepSurgicalIndicationVisible={baseline.surgicalIndication}
                surgicalIndicationBlockedReason={
                  !consultaDeMedico
                    ? `${assinante?.nome ?? "O profissional da consulta"} não é médico e não pode indicar cirurgia.`
                    : !isPhysician
                      ? INDICACAO_SO_MEDICO
                      : crmSemNumeroDe
                        ? `Preencha o número e a UF do CRM de ${crmSemNumeroDe} em Colaboradores para indicar cirurgia.`
                        : undefined
                }
              />

              {canIssueClinicalDocuments && (
                <ClinicalDocumentActions
                  ensureRecordId={ensureRecordId}
                  cidCodes={fields.cidCodes}
                  patientId={patient.id}
                  doctorId={appointment.doctorId}
                  assinante={assinante}
                  profissionalDaConsulta={ehProfissionalDaConsulta}
                  dadosFabricados={bloqueado}
                  onEmitted={(document) => {
                    showSuccess(`${document.name} emitido.`);
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
                    disabled={finalizing || bloqueado}
                    className="min-h-[44px] rounded-xl"
                  >
                    Salvar rascunho
                  </Button>
                  <Button
                    onClick={handleFinalize}
                    isLoading={finalizing}
                    disabled={saving || bloqueado}
                    className="min-h-[44px] rounded-xl"
                  >
                    Finalizar atendimento
                  </Button>
                </div>
              )}

              {podeExcluirRascunho && (
                <div className="flex justify-end pb-4">
                  <button
                    type="button"
                    onClick={() => setConfirmarExclusao(true)}
                    disabled={saving || finalizing || excluindo}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Excluir rascunho
                  </button>
                </div>
              )}
            </div>

            {painelLateral && (
              <aside
                aria-label="Consulta anterior"
                className="sticky top-0 self-start max-h-[calc(100vh-12rem)] overflow-y-auto rounded-2xl border border-neutral-100 bg-white shadow-sm"
              >
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-neutral-100 bg-white px-4 py-3">
                  <h2 className="text-sm font-semibold text-neutral-900">
                    Consulta anterior
                  </h2>
                  <button
                    type="button"
                    onClick={() => setFichaAnteriorAberta(false)}
                    aria-label="Fechar consulta anterior"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="px-4 py-4">{fichaAnterior}</div>
              </aside>
            )}
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

      <Modal
        isOpen={fichaAnteriorAberta && !telaLarga && !readOnly}
        onClose={() => setFichaAnteriorAberta(false)}
        title="Consulta anterior"
        variant="drawer"
      >
        <div className="px-5 py-4">{fichaAnterior}</div>
      </Modal>

      <SalvarTextoRapidoModal
        conteudo={trechoParaSalvar}
        doctorId={appointment.doctorId}
        onClose={() => setTrechoParaSalvar(null)}
      />

      <ConfirmDeleteModal
        isOpen={confirmarExclusao}
        title="Excluir rascunho do atendimento"
        description={`Excluir o rascunho da ficha de ${patient.name}? A consulta volta para a agenda como antes de o atendimento ser iniciado.`}
        softDelete
        loading={excluindo}
        onCancel={() => setConfirmarExclusao(false)}
        onConfirm={handleDeleteDraft}
      />

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

function SaveStatusIndicator({
  status,
  dirty,
  savedAt,
  onRetry,
}: {
  status: SaveStatus;
  dirty: boolean;
  savedAt: Date | null;
  onRetry: () => void;
}) {
  if (status === "saving") {
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1 text-xs text-neutral-500"
      >
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
        Salvando…
      </span>
    );
  }
  if (status === "error" && dirty) {
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700"
      >
        Não foi possível salvar
        <button
          type="button"
          onClick={onRetry}
          className="underline underline-offset-2 hover:text-red-800"
        >
          Tentar de novo
        </button>
      </span>
    );
  }
  if (dirty) {
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1 text-xs text-neutral-500"
      >
        <Circle className="w-2 h-2 fill-current" aria-hidden="true" />
        Alterações não salvas
      </span>
    );
  }
  if (!savedAt) return null;
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1 text-xs text-neutral-500"
    >
      <Check className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
      Salvo às {formatHoraSalvo(savedAt)}
    </span>
  );
}
