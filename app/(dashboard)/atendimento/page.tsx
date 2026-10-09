"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CalendarDays, Stethoscope } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import Loading from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";
import { NewAppointmentModal } from "@/components/agenda/NewAppointmentModal";
import { AppointmentDetailModal } from "@/components/agenda/AppointmentDetailModal";
import { AgendaDoctorFilter } from "@/components/agenda/AgendaDoctorFilter";
import {
  appointmentService,
  Appointment,
  AppointmentStatus,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/services/appointment.service";
import { useAvailableDoctors } from "@/hooks/useAvailableDoctors";
import { diaParaData, useDiaAtual } from "@/hooks/useDiaAtual";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/http-error";
import { cn } from "@/lib/utils";
import { formatDoctorName } from "@/lib/formatters";
import { MONTHS, WEEKDAYS_SHORT, dateKey, hhmm, isToday } from "@/lib/calendar";
import {
  HUB_EMPTY_DESCRIPTION,
  HUB_PAGE_SIZE,
  HUB_TABS,
  HubTab,
  hubTabQuery,
} from "@/lib/atendimento-hub";
import { useOnboardingAction } from "@/components/onboarding/useOnboardingAction";
import { criarConsultaDemo } from "@/lib/onboarding/demo-data";

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  waiting: "bg-orange-50 text-orange-700 border-orange-200",
  in_progress: "bg-cyan-50 text-cyan-800 border-cyan-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  no_show: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function AtendimentoHubPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const { can, user } = useAuth();
  const podeAgenda = can(Permission.AGENDA);

  const [tab, setTab] = useState<HubTab>("today");
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [newModal, setNewModal] = useState<{
    date?: string;
    appointment?: Appointment;
  } | null>(null);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useOnboardingAction("atendimento-abrir-detalhe-demo", () =>
    setDetail(criarConsultaDemo(user?.doctorProfile?.id ?? "")),
  );

  const { data: doctors = [] } = useAvailableDoctors();
  const doctorNameById = useMemo(() => {
    const m = new Map<string, string>();
    doctors.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [doctors]);
  const physicianById = useMemo(
    () => new Map(doctors.map((d) => [d.id, d.isPhysician] as const)),
    [doctors],
  );

  const hoje = useDiaAtual();
  const tabQuery = useMemo(
    () => hubTabQuery(tab, diaParaData(hoje)),
    [tab, hoje],
  );
  const { from, to, status, order } = tabQuery;

  const query = useInfiniteQuery({
    queryKey: [
      "appointments",
      "hub",
      from ?? null,
      to ?? null,
      status.join(","),
      order,
      selectedDoctorIds.join(","),
    ],
    queryFn: ({ pageParam }) =>
      appointmentService.getAgendaPage({
        ...tabQuery,
        doctorIds: selectedDoctorIds,
        skip: pageParam,
        take: HUB_PAGE_SIZE,
        withDoctorCounts: pageParam === 0,
      }),
    initialPageParam: 0,
    getNextPageParam: (ultima, paginas) => {
      const carregadas = paginas.reduce((n, p) => n + p.records.length, 0);
      return carregadas < ultima.total ? carregadas : undefined;
    },
    placeholderData: keepPreviousData,
  });

  const records = useMemo(
    () => query.data?.pages.flatMap((p) => p.records),
    [query.data],
  );
  const totalNoServidor = query.data?.pages[0]?.total ?? 0;
  const faltam = Math.max(0, totalNoServidor - (records?.length ?? 0));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["appointments"] });

  const groups = useMemo(() => {
    const list = [...(records ?? [])]
      .sort((a, b) => {
        const diff =
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        return order === "DESC" ? -diff : diff;
      });

    const byDay = new Map<string, Appointment[]>();
    for (const a of list) {
      const key = dateKey(new Date(a.scheduledAt));
      const arr = byDay.get(key);
      if (arr) arr.push(a);
      else byDay.set(key, [a]);
    }
    return Array.from(byDay.entries());
  }, [records, order]);

  const total = groups.reduce((n, [, arr]) => n + arr.length, 0);

  const countByDoctorId = query.data?.pages[0]?.countByDoctorId;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentService.updateStatus(id, status),
    onMutate: ({ id }) => setBusyId(id),
    onSuccess: () => {
      showSuccess("Consulta atualizada.");
      setDetail(null);
      invalidate();
    },
    onError: (err) =>
      showError(getApiErrorMessage(err, "Não foi possível atualizar.")),
    onSettled: () => setBusyId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentService.delete(id),
    onMutate: (id) => setBusyId(id),
    onSuccess: () => {
      showSuccess("Consulta excluída.");
      setDetail(null);
      invalidate();
    },
    onError: (err) =>
      showError(getApiErrorMessage(err, "Não foi possível excluir.")),
    onSettled: () => setBusyId(null),
  });

  const startAttendance = useCallback(
    (id: string) => router.push(`/atendimento/${id}`),
    [router],
  );

  return (
    <PageContainer>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex flex-col gap-3 px-3 lg:px-6 py-3 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-base lg:text-lg font-bold text-neutral-900">
                Atendimento
              </h1>
              <p className="text-xs text-neutral-500">
                Consultas e fichas dos pacientes
              </p>
            </div>

            {query.isFetching && (
              <span className="shrink-0">
                <Loading size="sm" />
              </span>
            )}

            {podeAgenda && (
              <button
                onClick={() => setNewModal({})}
                data-tour="atendimento-nova-consulta"
                className="ml-auto flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-0 px-3 rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors shrink-0"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="text-xs font-semibold hidden sm:inline">
                  Nova consulta
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div
              data-tour="atendimento-abas"
              className="flex items-center bg-neutral-100 rounded-lg p-0.5"
            >
              {HUB_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold transition-colors",
                    tab === t.key
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-800",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {podeAgenda && (
              <button
                onClick={() => router.push("/agenda")}
                className="h-8 px-3 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors shrink-0 flex items-center gap-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Ver agenda
              </button>
            )}

            {doctors.length > 1 && (
              <div className="sm:ml-auto">
                <AgendaDoctorFilter
                  doctors={doctors}
                  selectedDoctorIds={selectedDoctorIds}
                  onChange={setSelectedDoctorIds}
                  countByDoctorId={countByDoctorId}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 lg:px-6 py-4">
          {query.isError && !query.isFetchNextPageError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <p className="text-sm text-red-500">
                Não foi possível carregar as consultas.
              </p>
              <button
                onClick={() => query.refetch()}
                className="text-sm text-teal-600 hover:text-teal-800 underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : query.isLoading ? (
            <div className="py-16 flex justify-center">
              <Loading />
            </div>
          ) : total === 0 ? (
            <EmptyState
              icon={<Stethoscope className="w-10 h-10" />}
              title="Nenhuma consulta"
              description={HUB_EMPTY_DESCRIPTION[tab]}
              action={
                podeAgenda ? (
                  <button
                    onClick={() => setNewModal({})}
                    className="min-h-[44px] md:min-h-[36px] px-4 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors"
                  >
                    Nova consulta
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto">
              {groups.map(([key, items]) => {
                const d = new Date(`${key}T00:00:00`);
                return (
                  <div key={key} className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                      {WEEKDAYS_SHORT[d.getDay()]}, {d.getDate()} de{" "}
                      {MONTHS[d.getMonth()]}
                      {isToday(d) && (
                        <span className="ml-2 text-teal-600">Hoje</span>
                      )}
                    </p>
                    <div className="flex flex-col gap-2">
                      {items.map((a) => (
                        <AppointmentRow
                          key={a.id}
                          appointment={a}
                          doctorName={doctorNameById.get(a.doctorId)}
                          doctorIsPhysician={physicianById.get(a.doctorId)}
                          showDoctor={doctors.length > 1}
                          onOpen={() => setDetail(a)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {totalNoServidor > HUB_PAGE_SIZE && (
                <div className="flex flex-col items-center gap-2 pt-2 pb-4">
                  <p className="text-xs text-neutral-500" role="status">
                    Mostrando {(records?.length ?? 0).toLocaleString("pt-BR")} de{" "}
                    {totalNoServidor.toLocaleString("pt-BR")} consultas
                  </p>
                  {query.isFetchNextPageError && !query.isFetchingNextPage && (
                    <p role="alert" className="text-xs text-red-600">
                      Não foi possível carregar mais consultas.
                    </p>
                  )}
                  <div className="flex flex-wrap justify-center gap-2">
                    {query.hasNextPage && (
                      <button
                        type="button"
                        onClick={() => query.fetchNextPage()}
                        disabled={query.isFetchingNextPage}
                        className="min-h-[44px] md:min-h-[36px] px-4 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                      >
                        {query.isFetchingNextPage
                          ? "Carregando..."
                          : query.isFetchNextPageError
                            ? "Tentar de novo"
                            : `Carregar mais ${Math.min(HUB_PAGE_SIZE, faltam)}`}
                      </button>
                    )}
                    {podeAgenda && (
                      <button
                        type="button"
                        onClick={() => router.push("/agenda")}
                        className="min-h-[44px] md:min-h-[36px] px-4 rounded-lg text-xs font-semibold text-teal-700 hover:bg-teal-50 transition-colors flex items-center gap-1.5"
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                        Ver na agenda
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {newModal && (
        <NewAppointmentModal
          isOpen
          onClose={() => setNewModal(null)}
          onSaved={() => {
            showSuccess(
              newModal.appointment ? "Consulta atualizada." : "Consulta agendada.",
            );
            invalidate();
          }}
          defaultDate={newModal.date ?? null}
          appointment={newModal.appointment ?? null}
        />
      )}

      {detail && (
        <AppointmentDetailModal
          appointment={detail}
          doctorName={doctorNameById.get(detail.doctorId)}
          doctorIsPhysician={physicianById.get(detail.doctorId)}
          busy={busyId === detail.id}
          onClose={() => setDetail(null)}
          onEdit={() => {
            const appt = detail;
            setDetail(null);
            setNewModal({ appointment: appt });
          }}
          onStartAttendance={() => startAttendance(detail.id)}
          onChangeStatus={(status) =>
            statusMutation.mutate({ id: detail.id, status })
          }
          onDelete={() => deleteMutation.mutate(detail.id)}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </PageContainer>
  );
}

function AppointmentRow({
  appointment: a,
  doctorName,
  doctorIsPhysician,
  showDoctor,
  onOpen,
}: {
  appointment: Appointment;
  doctorName?: string;
  doctorIsPhysician?: boolean;
  showDoctor: boolean;
  onOpen: () => void;
}) {
  const start = new Date(a.scheduledAt);
  const end = new Date(start.getTime() + a.durationMinutes * 60_000);

  return (
    <button
      onClick={onOpen}
      className="w-full text-left flex items-center gap-3 rounded-xl border border-neutral-100 bg-white px-3 py-3 hover:border-neutral-200 hover:bg-neutral-50 transition-colors"
    >
      <div className="flex flex-col items-center justify-center w-14 shrink-0">
        <span className="text-sm font-bold text-neutral-900 tabular-nums">
          {hhmm(start)}
        </span>
        <span className="text-[11px] text-neutral-400 tabular-nums">
          {hhmm(end)}
        </span>
      </div>

      <div className="w-px self-stretch bg-neutral-100" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 truncate">
          {a.patient?.name ?? "Paciente"}
        </p>
        <p className="text-xs text-neutral-500 truncate">
          {APPOINTMENT_TYPE_LABELS[a.type]}
          {showDoctor && doctorName ? ` · ${formatDoctorName(doctorName, doctorIsPhysician)}` : ""}
        </p>
      </div>

      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0",
          STATUS_BADGE[a.status],
        )}
      >
        {APPOINTMENT_STATUS_LABELS[a.status]}
      </span>

      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-neutral-300 shrink-0 hidden sm:block"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}
