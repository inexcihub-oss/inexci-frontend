"use client";

import { useEffect, useRef, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { SpinnerButton } from "@/components/shared/ModalFooter";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { TOUR_DEMO_APPOINTMENT_ID } from "@/lib/onboarding/demo-data";
import { Permission } from "@/lib/permissions";
import {
  Appointment,
  AppointmentActivity,
  AppointmentStatus,
  appointmentService,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
} from "@/services/appointment.service";
import { cn } from "@/lib/utils";
import { capitalizeFirst, formatDoctorName } from "@/lib/formatters";
import { AppointmentHistory } from "@/components/agenda/AppointmentHistory";
import {
  ChevronDown,
  Clock,
  CreditCard,
  User,
  Tag,
  FileText,
  MapPin,
} from "lucide-react";

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  waiting: "bg-orange-50 text-orange-700 border-orange-200",
  in_progress: "bg-cyan-50 text-cyan-800 border-cyan-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  no_show: "bg-amber-50 text-amber-700 border-amber-200",
};

const ACAO = {
  confirmar: { status: "confirmed", label: "Confirmar", cls: "text-indigo-700 border-indigo-200 hover:bg-indigo-50" },
  chegou: { status: "waiting", label: "Chegou", cls: "text-orange-700 border-orange-200 hover:bg-orange-50" },
  desfazerChegada: { status: "confirmed", label: "Desfazer chegada", cls: "text-indigo-700 border-indigo-200 hover:bg-indigo-50" },
  realizada: { status: "completed", label: "Realizada", cls: "text-green-700 border-green-200 hover:bg-green-50" },
  faltou: { status: "no_show", label: "Faltou", cls: "text-amber-700 border-amber-200 hover:bg-amber-50" },
  cancelar: { status: "cancelled", label: "Cancelar", cls: "text-red-600 border-red-200 hover:bg-red-50" },
  reabrir: { status: "scheduled", label: "Reabrir", cls: "text-blue-700 border-blue-200 hover:bg-blue-50" },
} as const satisfies Record<string, { status: AppointmentStatus; label: string; cls: string }>;

/**
 * Ações rápidas por status. "Chegou" leva à sala de espera (aguardando); abrir
 * a ficha leva a "em atendimento" pelo backend, por isso não há botão para
 * isso aqui.
 */
const QUICK: Record<
  AppointmentStatus,
  { status: AppointmentStatus; label: string; cls: string }[]
> = {
  scheduled: [ACAO.confirmar, ACAO.chegou, ACAO.realizada, ACAO.faltou, ACAO.cancelar],
  confirmed: [ACAO.chegou, ACAO.realizada, ACAO.faltou, ACAO.cancelar],
  waiting: [ACAO.desfazerChegada, ACAO.realizada, ACAO.faltou, ACAO.cancelar],
  in_progress: [ACAO.realizada, ACAO.cancelar],
  completed: [],
  cancelled: [ACAO.reabrir],
  no_show: [ACAO.reabrir],
};

/**
 * Para onde "Desfazer chegada" volta: o status de antes do último "Chegou",
 * lido do histórico da consulta. Quem só estava agendado volta a agendado —
 * não ganha uma confirmação que o paciente nunca deu. Sem esse registro
 * (consulta antiga, histórico falhou), volta a confirmada.
 */
export function statusAntesDaChegada(
  atividades: AppointmentActivity[],
): AppointmentStatus {
  const chegada = atividades
    .filter((a) => a.type === "status_change" && a.toStatus === "waiting")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return chegada?.fromStatus === "scheduled" ||
    chegada?.fromStatus === "confirmed"
    ? chegada.fromStatus
    : "confirmed";
}

function formatWhen(iso: string, durationMinutes: number): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const day = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(start);
  const t = (d: Date) =>
    `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  // Só a inicial em maiúscula: `capitalize` de CSS subia também as
  // preposições ("Quarta-Feira, 05 De Agosto").
  return capitalizeFirst(`${day} · ${t(start)} às ${t(end)}`);
}

interface Props {
  appointment: Appointment;
  doctorName?: string;
  /** Sem CRM (nutricionista, técnica…) o nome sai sem "Dr(a).". */
  doctorIsPhysician?: boolean;
  busy?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStartAttendance: () => void;
  onChangeStatus: (status: AppointmentStatus) => void;
  onDelete: () => void;
}

export function AppointmentDetailModal({
  appointment,
  doctorName,
  doctorIsPhysician,
  busy,
  onClose,
  onEdit,
  onStartAttendance,
  onChangeStatus,
  onDelete,
}: Props) {
  const { isDoctor, can } = useAuth();
  const { emTour } = useOnboarding();
  // Guarda por PROVENIÊNCIA, não só pelo estado do tour: se o usuário sair
  // do tour ainda olhando esta consulta fabricada, o botão continua
  // desabilitado — o dado nunca deixa de ser fabricado só porque o tour
  // acabou.
  const dadosFabricados = appointment.id === TOUR_DEMO_APPOINTMENT_ID;

  // Atender é ato do médico; quem agenda não abre a ficha. A consulta já
  // realizada abre para todos (leitura do prontuário) — só cancelada/faltou
  // não têm atendimento nenhum.
  const canAttend =
    appointment.status === "completed" ||
    (isDoctor &&
      (appointment.status === "scheduled" ||
        appointment.status === "confirmed" ||
        appointment.status === "waiting" ||
        appointment.status === "in_progress"));
  // Mexer na consulta (status, editar, excluir) é ato de quem tem Agenda —
  // eixo diferente de `isDoctor`, que só decide o botão de atendimento acima.
  const podeAgenda = can(Permission.AGENDA);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [desfazendo, setDesfazendo] = useState(false);
  const actions = podeAgenda ? QUICK[appointment.status] : [];

  // "Desfazer chegada" espera o histórico antes de mudar o status. Se o
  // modal fechar (ou passar a mostrar outra consulta) nesse meio-tempo, a
  // resposta chega tarde e não pode mais mexer em nada.
  const vivo = useRef(true);
  const consultaAtual = useRef(appointment.id);
  consultaAtual.current = appointment.id;
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const aplicarAcao = async (acao: (typeof actions)[number]) => {
    if (acao !== ACAO.desfazerChegada) {
      onChangeStatus(acao.status);
      return;
    }
    const id = appointment.id;
    setDesfazendo(true);
    let destino: AppointmentStatus;
    try {
      destino = statusAntesDaChegada(
        await appointmentService.listActivities(id),
      );
    } catch {
      destino = ACAO.desfazerChegada.status;
    }
    if (!vivo.current) return;
    setDesfazendo(false);
    if (consultaAtual.current !== id) return;
    onChangeStatus(destino);
  };

  return (
    <Modal isOpen onClose={onClose} title="Consulta" size="sm">
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-neutral-900">
            {appointment.patient?.name ?? "Paciente"}
          </h3>
          <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
            {appointment.isWalkIn && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                Encaixe
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                STATUS_BADGE[appointment.status],
              )}
            >
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-neutral-600">
          <Row icon={<Clock className="w-4 h-4" />}>
            <span>
              {formatWhen(appointment.scheduledAt, appointment.durationMinutes)}
            </span>
          </Row>
          <Row icon={<Tag className="w-4 h-4" />}>
            {APPOINTMENT_TYPE_LABELS[appointment.type]} ·{" "}
            {appointment.durationMinutes} min
          </Row>
          {appointment.clinic && (
            <Row icon={<MapPin className="w-4 h-4" />}>
              <span className="sr-only">Local de atendimento</span>
              {appointment.clinic.name}
              {appointment.room && ` · ${appointment.room.name}`}
            </Row>
          )}
          <Row icon={<CreditCard className="w-4 h-4" />}>
            <span className="sr-only">Convênio</span>
            {appointment.healthPlan?.name ?? "Particular"}
          </Row>
          {doctorName && (
            <Row icon={<User className="w-4 h-4" />}>
              {formatDoctorName(doctorName, doctorIsPhysician)}
            </Row>
          )}
          {appointment.notes && (
            <Row icon={<FileText className="w-4 h-4" />}>{appointment.notes}</Row>
          )}
          {appointment.createdBy && (
            <p className="text-xs text-neutral-400">
              Agendada por {appointment.createdBy.name}
            </p>
          )}
        </div>

        {/* Histórico: carrega só ao abrir. A consulta fabricada do tour não
            existe no banco, então não tem histórico. */}
        {!dadosFabricados && (
          <div className="border-t border-neutral-100 pt-3">
            <button
              type="button"
              aria-expanded={historicoAberto}
              onClick={() => setHistoricoAberto((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-semibold text-neutral-600 hover:text-neutral-800 min-h-[44px] md:min-h-[36px]"
            >
              Histórico
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform",
                  historicoAberto && "rotate-180",
                )}
              />
            </button>
            {historicoAberto && (
              <div className="pt-2">
                <AppointmentHistory
                  appointmentId={appointment.id}
                  podeComentar={podeAgenda}
                />
              </div>
            )}
          </div>
        )}

        {/* Ações de status */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2" data-tour="agenda-consulta-acoes">
            {actions.map((a) => (
              <button
                key={a.label}
                disabled={busy || desfazendo || emTour || dadosFabricados}
                onClick={() => aplicarAcao(a)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold border bg-white transition-colors disabled:opacity-40 min-h-[44px] md:min-h-[36px]",
                  a.cls,
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div
        className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 px-4 md:px-6 py-3 md:py-4 border-t border-neutral-100 sticky bottom-0 bg-white"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {podeAgenda ? (
          <SpinnerButton
            variant="secondary"
            onClick={onDelete}
            disabled={busy || emTour || dadosFabricados}
            className="w-full sm:w-auto !text-red-600 hover:!bg-red-50 !border-red-200"
          >
            Excluir
          </SpinnerButton>
        ) : (
          <span />
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          {podeAgenda && (
            <SpinnerButton
              variant="secondary"
              onClick={onEdit}
              disabled={busy}
              className="w-full sm:w-auto"
            >
              Editar
            </SpinnerButton>
          )}
          {canAttend && (
            <SpinnerButton
              variant="primary"
              onClick={onStartAttendance}
              disabled={busy}
              data-tour="atendimento-iniciar"
              className="w-full sm:w-auto"
            >
              {appointment.status === "completed"
                ? "Ver atendimento"
                : appointment.status === "in_progress"
                  ? "Continuar atendimento"
                  : "Iniciar atendimento"}
            </SpinnerButton>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Row({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-neutral-400 mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
