"use client";

import { Modal } from "@/components/ui/Modal";
import { SpinnerButton } from "@/components/shared/ModalFooter";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { TOUR_DEMO_APPOINTMENT_ID } from "@/lib/onboarding/demo-data";
import { Permission } from "@/lib/permissions";
import {
  Appointment,
  AppointmentStatus,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
} from "@/services/appointment.service";
import { cn } from "@/lib/utils";
import { capitalizeFirst, formatDoctorName } from "@/lib/formatters";
import { Clock, User, Tag, FileText, MapPin } from "lucide-react";

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  no_show: "bg-amber-50 text-amber-700 border-amber-200",
};

const QUICK: Record<
  AppointmentStatus,
  { status: AppointmentStatus; label: string; cls: string }[]
> = {
  scheduled: [
    { status: "confirmed", label: "Confirmar", cls: "text-indigo-700 border-indigo-200 hover:bg-indigo-50" },
    { status: "completed", label: "Realizada", cls: "text-green-700 border-green-200 hover:bg-green-50" },
    { status: "no_show", label: "Faltou", cls: "text-amber-700 border-amber-200 hover:bg-amber-50" },
    { status: "cancelled", label: "Cancelar", cls: "text-red-600 border-red-200 hover:bg-red-50" },
  ],
  confirmed: [
    { status: "completed", label: "Realizada", cls: "text-green-700 border-green-200 hover:bg-green-50" },
    { status: "no_show", label: "Faltou", cls: "text-amber-700 border-amber-200 hover:bg-amber-50" },
    { status: "cancelled", label: "Cancelar", cls: "text-red-600 border-red-200 hover:bg-red-50" },
  ],
  completed: [],
  cancelled: [
    { status: "scheduled", label: "Reabrir", cls: "text-blue-700 border-blue-200 hover:bg-blue-50" },
  ],
  no_show: [
    { status: "scheduled", label: "Reabrir", cls: "text-blue-700 border-blue-200 hover:bg-blue-50" },
  ],
};

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
        appointment.status === "confirmed"));
  // Mexer na consulta (status, editar, excluir) é ato de quem tem Agenda —
  // eixo diferente de `isDoctor`, que só decide o botão de atendimento acima.
  const podeAgenda = can(Permission.AGENDA);
  const actions = podeAgenda ? QUICK[appointment.status] : [];

  return (
    <Modal isOpen onClose={onClose} title="Consulta" size="sm">
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-neutral-900">
            {appointment.patient?.name ?? "Paciente"}
          </h3>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0",
              STATUS_BADGE[appointment.status],
            )}
          >
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </span>
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
            </Row>
          )}
          {doctorName && (
            <Row icon={<User className="w-4 h-4" />}>
              {formatDoctorName(doctorName)}
            </Row>
          )}
          {appointment.notes && (
            <Row icon={<FileText className="w-4 h-4" />}>{appointment.notes}</Row>
          )}
        </div>

        {/* Ações de status */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2" data-tour="agenda-consulta-acoes">
            {actions.map((a) => (
              <button
                key={a.status}
                disabled={busy || emTour || dadosFabricados}
                onClick={() => onChangeStatus(a.status)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold border bg-white transition-colors disabled:opacity-40 min-h-[36px]",
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
