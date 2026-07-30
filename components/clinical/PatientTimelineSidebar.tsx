"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";
import { NewAppointmentModal } from "@/components/agenda/NewAppointmentModal";
import { AppointmentDetailModal } from "@/components/agenda/AppointmentDetailModal";
import {
  appointmentService,
  Appointment,
  AppointmentStatus,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/services/appointment.service";
import {
  SurgeryRequestListItem,
  STATUS_NUMBER_TO_STRING,
  STATUS_COLORS,
} from "@/services/surgery-request.service";
import { ChevronRight, CalendarDays, Stethoscope } from "lucide-react";

const APPOINTMENT_BADGE: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  confirmed: "bg-indigo-50 text-indigo-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
  no_show: "bg-amber-50 text-amber-700",
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

type TimelineEntry =
  | { kind: "appointment"; id: string; at: number; appointment: Appointment }
  | { kind: "surgery"; id: string; at: number; surgery: SurgeryRequestListItem };

/** Data que posiciona a cirurgia: a da cirurgia, ou a criação enquanto não houver. */
function surgeryAt(surgery: SurgeryRequestListItem): number {
  const raw = surgery.surgeryDate ?? surgery.createdAt;
  return raw ? new Date(raw).getTime() : 0;
}

/**
 * Consultas e cirurgias do paciente na sidebar, em ordem cronológica (passadas
 * e futuras). Consulta abre o modal de detalhe (status + atendimento);
 * cirurgia navega para a solicitação.
 *
 * A criação de consulta vive na página (botão "Nova consulta"), que também é
 * dona da lista de consultas — aqui só exibimos e pedimos recarga via
 * `onReload` depois de editar/mudar status/excluir.
 */
export function PatientTimelineSidebar({
  appointments,
  loadingAppointments,
  surgeries,
  loadingSurgeries,
  onReload,
}: {
  appointments: Appointment[];
  loadingAppointments: boolean;
  surgeries: SurgeryRequestListItem[];
  loadingSurgeries: boolean;
  onReload: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [busy, setBusy] = useState(false);

  const entries = useMemo<TimelineEntry[]>(() => {
    const merged: TimelineEntry[] = [
      ...appointments.map((appointment) => ({
        kind: "appointment" as const,
        id: `appt-${appointment.id}`,
        at: new Date(appointment.scheduledAt).getTime(),
        appointment,
      })),
      ...surgeries.map((surgery) => ({
        kind: "surgery" as const,
        id: `sc-${surgery.id}`,
        at: surgeryAt(surgery),
        surgery,
      })),
    ];
    return merged.sort((a, b) => b.at - a.at);
  }, [appointments, surgeries]);

  const handleChangeStatus = async (status: AppointmentStatus) => {
    if (!selected) return;
    setBusy(true);
    try {
      await appointmentService.updateStatus(selected.id, status);
      setSelected(null);
      onReload();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await appointmentService.delete(selected.id);
      setSelected(null);
      onReload();
    } finally {
      setBusy(false);
    }
  };

  const isLoading = loadingAppointments || loadingSurgeries;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-13 border-b border-neutral-100 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">
          Consultas e cirurgias
        </h3>
        {!isLoading && (
          <span className="text-xs text-gray-400">{entries.length}</span>
        )}
      </div>

      {/* Itens */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center py-8 px-4">
            <p className="text-xs text-gray-400 text-center">
              Nenhuma consulta ou cirurgia registrada.
            </p>
          </div>
        ) : (
          entries.map((entry) => {
            if (entry.kind === "appointment") {
              const a = entry.appointment;
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelected(a)}
                  className="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors min-h-[44px]"
                >
                  <span
                    className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"
                    title="Consulta"
                  >
                    <CalendarDays className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-gray-900 truncate">
                      {APPOINTMENT_TYPE_LABELS[a.type]}
                    </span>
                    <span className="text-xs text-blue-600 font-medium truncate">
                      Consulta
                      <span className="text-gray-500 font-normal">
                        {" · "}
                        {formatWhen(a.scheduledAt)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded-lg ${APPOINTMENT_BADGE[a.status]}`}
                    >
                      {APPOINTMENT_STATUS_LABELS[a.status]}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              );
            }

            const surgery = entry.surgery;
            const statusLabel =
              STATUS_NUMBER_TO_STRING[surgery.status] ?? "Pendente";
            const colors = STATUS_COLORS[statusLabel] ?? {
              bg: "bg-gray-50",
              text: "text-gray-600",
            };
            const procedureName =
              (surgery as { procedureName?: string }).procedureName ||
              surgery.procedure?.name ||
              surgery.tussProcedure?.description ||
              "Procedimento não especificado";
            const when = surgery.surgeryDate ?? surgery.createdAt;
            return (
              <div
                key={entry.id}
                onClick={() => router.push(`/solicitacao/${surgery.id}`)}
                className="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors min-h-[44px]"
              >
                <span
                  className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"
                  title="Cirurgia"
                >
                  <Stethoscope className="w-4 h-4" />
                </span>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-xs font-semibold text-gray-900 truncate">
                    {procedureName}
                  </span>
                  <span className="text-xs text-purple-600 font-medium truncate">
                    Cirurgia
                    <span className="text-gray-500 font-normal">
                      {" · "}
                      {when ? formatDate(when) : "—"}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-xs px-2 py-1 rounded-lg ${colors.bg} ${colors.text}`}
                  >
                    {statusLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing && (
        <NewAppointmentModal
          isOpen
          onClose={() => setEditing(null)}
          onSaved={onReload}
          appointment={editing}
        />
      )}

      {selected && (
        <AppointmentDetailModal
          appointment={selected}
          busy={busy}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected);
            setSelected(null);
          }}
          onStartAttendance={() => router.push(`/atendimento/${selected.id}`)}
          onChangeStatus={handleChangeStatus}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
