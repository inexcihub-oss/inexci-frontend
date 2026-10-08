"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout } from "@/components/details";
import { Spinner } from "@/components/ui";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { patientService, Patient } from "@/services/patient.service";
import { healthPlanService } from "@/services/health-plan.service";
import { PatientRegistrationForm } from "@/components/patients/PatientRegistrationForm";
import { PatientPhotoField } from "@/components/patients/PatientPhotoField";
import {
  PatientTimeline,
  ProximaConsulta,
} from "@/components/patients/PatientTimeline";
import { usePatientHistory } from "@/components/patients/usePatientHistory";
import { PatientDocuments } from "@/components/clinical/PatientDocuments";
import { NewAppointmentModal } from "@/components/agenda/NewAppointmentModal";
import { AppointmentDetailModal } from "@/components/agenda/AppointmentDetailModal";
import {
  appointmentService,
  Appointment,
  AppointmentStatus,
} from "@/services/appointment.service";
import {
  idadeEmAnos,
  montarHistorico,
  ultimaVisita,
} from "@/lib/patient-history";
import { formatPhone } from "@/lib/formatters";
import { getApiErrorMessage } from "@/lib/http-error";
import { logger } from "@/lib/logger";
import { resolverReturnUrl } from "@/lib/safe-return-url";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import { Plus } from "lucide-react";

type Aba = "historico" | "documentos" | "cadastro";

function dataCurta(value: string | number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function dataEHora(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date(value))
    .replace(",", " às");
}

export default function PacienteDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnUrl = searchParams.get("returnUrl");
  const returnUrl = (() => {
    if (!rawReturnUrl) return null;
    if (typeof window === "undefined") return null;
    const decoded = decodeURIComponent(rawReturnUrl);
    return resolverReturnUrl(decoded, window.location.origin);
  })();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [convenio, setConvenio] = useState<string | null>(null);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [consultaAberta, setConsultaAberta] = useState<Appointment | null>(
    null,
  );
  const [consultaEditando, setConsultaEditando] = useState<Appointment | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const { can } = useAuth();
  const podeAgenda = can(Permission.AGENDA);
  // Documentos exigem Atendimento no backend (inclusive o GET): sem a
  // permissão a aba nem aparece.
  const podeAtendimento = can(Permission.ATENDIMENTO);

  const abas = useMemo(
    () =>
      [
        { id: "cadastro" as const, label: "Cadastro" },
        { id: "historico" as const, label: "Histórico" },
        ...(podeAtendimento
          ? [{ id: "documentos" as const, label: "Documentos" }]
          : []),
      ] satisfies { id: Aba; label: string }[],
    [podeAtendimento],
  );

  // Guarda a aba PEDIDA (`?tab=` ou o clique) e deriva a efetiva a cada
  // render: se as permissões mudarem depois da montagem (sessão recarregada,
  // permissão concedida/revogada), `?tab=documentos` passa a valer quando a
  // aba existir, e cai no Cadastro enquanto o usuário não a tiver — sem
  // depender do valor que `can()` tinha no primeiro render.
  const [abaPedida, setAbaPedida] = useState<Aba | null>(
    () => searchParams.get("tab") as Aba | null,
  );
  const aba: Aba =
    abaPedida && abas.some((a) => a.id === abaPedida) ? abaPedida : "cadastro";

  const irParaAba = (proxima: Aba) => {
    setAbaPedida(proxima);
    const query = new URLSearchParams(searchParams.toString());
    query.set("tab", proxima);
    router.replace(`?${query.toString()}`, { scroll: false });
  };

  const historicoData = usePatientHistory(params.id);
  const historico = useMemo(
    () =>
      montarHistorico({
        appointments: historicoData.appointments,
        records: historicoData.records,
        surgeries: historicoData.surgeries,
      }),
    [historicoData.appointments, historicoData.records, historicoData.surgeries],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    patientService
      .getById(params.id)
      .then((data) => {
        if (!active) return;
        if (!data) logger.error("Paciente não encontrado");
        setPatient(data ?? null);
      })
      .catch((error) => logger.error("Erro ao carregar paciente:", error))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params.id]);

  const healthPlanId = patient?.healthPlanId;
  useEffect(() => {
    if (!healthPlanId) {
      setConvenio(null);
      return;
    }
    let active = true;
    healthPlanService
      .getById(healthPlanId)
      .then((plan) => active && setConvenio(plan?.name ?? null))
      .catch(() => active && setConvenio(null));
    return () => {
      active = false;
    };
  }, [healthPlanId]);

  const handleChangeStatus = async (status: AppointmentStatus) => {
    if (!consultaAberta) return;
    setBusy(true);
    try {
      await appointmentService.updateStatus(consultaAberta.id, status);
      setConsultaAberta(null);
      historicoData.reload();
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Não foi possível atualizar a consulta."),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!consultaAberta) return;
    setBusy(true);
    try {
      await appointmentService.delete(consultaAberta.id);
      setConsultaAberta(null);
      historicoData.reload();
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Não foi possível excluir a consulta."),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (!patient) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Paciente não encontrado.</p>
        </div>
      </PageContainer>
    );
  }

  const idade = idadeEmAnos(patient.birthDate);
  const dadosBasicos = [
    idade !== null ? `${idade} ${idade === 1 ? "ano" : "anos"}` : null,
    convenio,
    patient.phone ? formatPhone(patient.phone) : null,
  ].filter(Boolean);
  const ultima = historicoData.loading ? null : ultimaVisita(historico);
  const proxima = historicoData.loading ? null : historico.proximas[0];

  const subtitulo = (
    <div className="flex flex-col gap-0.5">
      {dadosBasicos.length > 0 && <span>{dadosBasicos.join(" · ")}</span>}
      {(ultima || proxima) && (
        <span>
          {ultima && <>Última visita {dataCurta(ultima)}</>}
          {ultima && proxima && " · "}
          {proxima && <>Próxima consulta {dataEHora(proxima.scheduledAt)}</>}
        </span>
      )}
    </div>
  );

  return (
    <PageContainer>
      <DetailPageLayout
        sectionTitle="Pacientes"
        backHref="/pacientes"
        itemName={patient.name}
        itemSubtitle={subtitulo}
        sidebarIcon="calendar"
        sidebarContent={
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 h-13 border-b border-neutral-100 shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">
                Próximas consultas
              </h3>
              {!historicoData.loading && (
                <span className="text-xs text-gray-400">
                  {historico.proximas.length}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {historicoData.loading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="sm" />
                </div>
              ) : historico.proximas.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-gray-400">
                  Nenhuma consulta agendada.
                </p>
              ) : (
                <ul aria-label="Próximas consultas">
                  {historico.proximas.map((a) => (
                    <li key={a.id} className="border-b border-gray-100">
                      <ProximaConsulta
                        appointment={a}
                        profissional={historicoData.profissionais.get(
                          a.doctorId,
                        )}
                        onAbrir={setConsultaAberta}
                        className="px-4 py-3"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        }
        avatar={
          <PatientPhotoField
            patient={patient}
            onChange={(saved) => {
              setPatient(saved);
              showToast("Foto do paciente atualizada.", "success");
            }}
          />
        }
        profileAction={
          podeAgenda ? (
            <button
              onClick={() => setIsNewAppointmentOpen(true)}
              aria-label="Nova consulta"
              className="flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3 rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2.2} />
              <span className="hidden sm:inline text-xs font-semibold">
                Nova consulta
              </span>
            </button>
          ) : undefined
        }
      >
        <div
          role="tablist"
          aria-label="Seções do paciente"
          className="flex items-center border-b border-neutral-100 overflow-x-auto scrollbar-hide"
        >
          {abas.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              id={`aba-${a.id}`}
              aria-selected={aba === a.id}
              aria-controls={`painel-${a.id}`}
              onClick={() => irParaAba(a.id)}
              className={`px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] -mb-px ${
                aba === a.id
                  ? "text-black border-b-[3px] border-teal-700"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {aba === "historico" && (
          <div role="tabpanel" id="painel-historico" aria-labelledby="aba-historico">
            {historicoData.loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="sm" />
              </div>
            ) : historicoData.error ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-red-600">
                  Não foi possível carregar o histórico do paciente.
                </p>
                <button
                  onClick={historicoData.reload}
                  className="text-sm font-semibold text-teal-700 hover:underline min-h-[44px] px-3"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <PatientTimeline
                historico={historico}
                documents={historicoData.documents}
                profissionais={historicoData.profissionais}
                podeVerSolicitacoes={can(Permission.SOLICITACOES)}
                onAbrirConsulta={setConsultaAberta}
                mostrarProximas={false}
              />
            )}
          </div>
        )}

        {aba === "documentos" && podeAtendimento && (
          <div role="tabpanel" id="painel-documentos" aria-labelledby="aba-documentos">
            <PatientDocuments patientId={patient.id} />
          </div>
        )}

        {/* O cadastro fica montado (só escondido) para trocar de aba não
            descartar o que foi digitado e ainda não salvo. */}
        <div
          role="tabpanel"
          id="painel-cadastro"
          aria-labelledby="aba-cadastro"
          hidden={aba !== "cadastro"}
        >
          <PatientRegistrationForm
            patient={patient}
            onSaved={(saved) => {
              setPatient(saved);
              showToast("Paciente atualizado com sucesso!", "success");
              if (returnUrl) {
                setTimeout(() => router.push(returnUrl), 800);
              }
            }}
            onCancel={() => router.push(returnUrl ?? "/pacientes")}
          />
        </div>
      </DetailPageLayout>

      <NewAppointmentModal
        isOpen={isNewAppointmentOpen}
        onClose={() => setIsNewAppointmentOpen(false)}
        onSaved={historicoData.reload}
        defaultPatientId={patient.id}
        defaultPatientLabel={patient.name}
        defaultHealthPlanId={patient.healthPlanId ?? null}
      />

      {consultaEditando && (
        <NewAppointmentModal
          isOpen
          onClose={() => setConsultaEditando(null)}
          onSaved={historicoData.reload}
          appointment={consultaEditando}
        />
      )}

      {consultaAberta && (
        <AppointmentDetailModal
          appointment={consultaAberta}
          doctorName={historicoData.profissionais.get(consultaAberta.doctorId)}
          doctorIsPhysician={historicoData.medicos.get(consultaAberta.doctorId)}
          busy={busy}
          onClose={() => setConsultaAberta(null)}
          onEdit={() => {
            setConsultaEditando(consultaAberta);
            setConsultaAberta(null);
          }}
          onStartAttendance={() =>
            router.push(`/atendimento/${consultaAberta.id}`)
          }
          onChangeStatus={handleChangeStatus}
          onDelete={handleDelete}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type as ToastType}
          onClose={hideToast}
        />
      )}
    </PageContainer>
  );
}
