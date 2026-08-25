"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import Loading from "@/components/ui/Loading";
import { Toast } from "@/components/ui/Toast";
import {
  surgeryRequestService,
  SurgeryRequestListItem,
} from "@/services/surgery-request.service";
import {
  appointmentService,
  Appointment,
  AppointmentStatus,
  APPOINTMENT_TYPE_LABELS,
} from "@/services/appointment.service";
import {
  AgendaFilterModal,
  AgendaFilterState,
  countActiveAgendaFilters,
  DEFAULT_AGENDA_FILTERS,
} from "@/components/agenda/AgendaFilterModal";
import { AgendaExportModal } from "@/components/agenda/AgendaExportModal";
import { NewAppointmentModal } from "@/components/agenda/NewAppointmentModal";
import { AppointmentDetailModal } from "@/components/agenda/AppointmentDetailModal";
import { DatePickerPopover } from "@/components/ui/DatePickerPopover";
import { CalendarTimeGrid } from "@/components/agenda/CalendarTimeGrid";
import { CalendarMonthView } from "@/components/agenda/CalendarMonthView";
import { useAvailableDoctors } from "@/hooks/useAvailableDoctors";
import { useClinics } from "@/hooks/useClinics";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/http-error";
import { cn } from "@/lib/utils";
import { useOnboardingAction } from "@/components/onboarding/useOnboardingAction";
import { criarConsultaDemo } from "@/lib/onboarding/demo-data";
import {
  CalEvent,
  MONTHS,
  MONTHS_SHORT,
  addDays,
  addMonths,
  appointmentToEvent,
  dateKey,
  hhmm,
  startOfDay,
  startOfMonth,
  startOfWeek,
  surgeryToEvent,
} from "@/lib/calendar";

type CalView = "day" | "week" | "month";
type SurgeryItem = SurgeryRequestListItem & { surgeryDate: string };

export default function AgendaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const { can, user } = useAuth();
  // Cirurgias vêm de `GET /surgery-requests/agenda`, que exige Solicitações —
  // um eixo diferente de Agenda. Quem só tem Agenda enxerga só as consultas.
  const podeVerCirurgias = can(Permission.SOLICITACOES);

  const [view, setView] = useState<CalView>("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [filters, setFilters] = useState<AgendaFilterState>(
    DEFAULT_AGENDA_FILTERS,
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [newModal, setNewModal] = useState<{
    date?: string;
    time?: string;
    appointment?: Appointment;
  } | null>(null);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Passo "horario" da trilha Agenda: abre o formulário de nova consulta ao
  // entrar no passo, em vez de esperar o usuário achar o botão real.
  useOnboardingAction("agenda-abrir-novo-horario", () => {
    // Espelha a limpeza já feita ao ENTRAR no passo seguinte — sem isso,
    // voltar do passo "status" para "horario" reempilha os dois modais.
    setDetail(null);
    setIsFilterOpen(false);
    setIsExportOpen(false);
    setNewModal({});
  });

  // Passo "status": abre o modal de detalhe com uma consulta fabricada —
  // nunca existe de verdade, só mostra onde ficam as ações de status.
  useOnboardingAction("agenda-abrir-detalhe-demo", () => {
    // O passo anterior ("horario") abriu o modal de nova consulta; sem
    // fechar aqui, os dois modais ficariam empilhados ao entrar neste
    // passo — `newModal` e `detail` são estados independentes.
    setNewModal(null);
    setIsFilterOpen(false);
    setIsExportOpen(false);
    setDetail(criarConsultaDemo(user?.doctorProfile?.id ?? ""));
  });

  // Os próximos dois passos mostram os próprios componentes já usados na
  // Agenda. Cada um fecha a demonstração anterior para não empilhar modais e
  // manter o destaque do tour acessível também em telas pequenas.
  useOnboardingAction("agenda-abrir-filtros", () => {
    setNewModal(null);
    setDetail(null);
    setIsExportOpen(false);
    setIsFilterOpen(true);
  });

  useOnboardingAction("agenda-abrir-exportacao", () => {
    setNewModal(null);
    setDetail(null);
    setIsFilterOpen(false);
    setIsExportOpen(true);
  });

  useOnboardingAction("agenda-fechar-modais", () => {
    setNewModal(null);
    setDetail(null);
    setIsFilterOpen(false);
    setIsExportOpen(false);
  });

  const { data: doctors = [] } = useAvailableDoctors();
  const { data: clinics = [] } = useClinics();
  const doctorNameById = useMemo(() => {
    const m = new Map<string, string>();
    doctors.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [doctors]);

  // ── Intervalo visível + dias ────────────────────────────────────────────────
  const { rangeFrom, rangeTo, days } = useMemo(() => {
    if (view === "day") {
      const s = startOfDay(anchor);
      return { rangeFrom: s, rangeTo: addDays(s, 1), days: [s] };
    }
    if (view === "week") {
      const s = startOfWeek(anchor);
      const ds = Array.from({ length: 7 }, (_, i) => addDays(s, i));
      return { rangeFrom: s, rangeTo: addDays(s, 7), days: ds };
    }
    const gridStart = startOfWeek(startOfMonth(anchor));
    return { rangeFrom: gridStart, rangeTo: addDays(gridStart, 42), days: [] };
  }, [view, anchor]);

  const fromISO = rangeFrom.toISOString();
  const toISO = rangeTo.toISOString();

  const surgeriesQuery = useQuery({
    queryKey: ["surgery-requests", "agenda", fromISO, toISO],
    queryFn: () => surgeryRequestService.getAgenda(fromISO, toISO),
    placeholderData: keepPreviousData,
    enabled: podeVerCirurgias,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["appointments", "agenda", fromISO, toISO],
    queryFn: () =>
      appointmentService.getAgenda({ from: fromISO, to: toISO }),
    placeholderData: keepPreviousData,
  });

  // `enabled: false` livra a busca inicial de 403, mas `refetch()` ignora
  // `enabled` (dispara a chamada de qualquer jeito) — por isso a query de
  // cirurgias também precisa sair de `loading`/`isError` explicitamente
  // quando falta a permissão, e `refetchAll` não pode chamar
  // `surgeriesQuery.refetch()` nesse caso.
  const loading =
    appointmentsQuery.isFetching ||
    (podeVerCirurgias && surgeriesQuery.isFetching);
  const isError =
    appointmentsQuery.isError || (podeVerCirurgias && surgeriesQuery.isError);

  const refetchAll = useCallback(() => {
    if (podeVerCirurgias) surgeriesQuery.refetch();
    appointmentsQuery.refetch();
  }, [podeVerCirurgias, surgeriesQuery, appointmentsQuery]);

  const invalidateAppointments = () =>
    queryClient.invalidateQueries({ queryKey: ["appointments", "agenda"] });

  // ── Eventos unificados ──────────────────────────────────────────────────────
  const allEvents = useMemo<CalEvent[]>(() => {
    const appts = (appointmentsQuery.data ?? []).map((a) =>
      appointmentToEvent(a, APPOINTMENT_TYPE_LABELS[a.type]),
    );
    const surgeries = (surgeriesQuery.data?.records ?? [])
      .filter(
        (r): r is SurgeryItem =>
          typeof r.surgeryDate === "string" && r.surgeryDate.length > 0,
      )
      .map(surgeryToEvent);
    return [...appts, ...surgeries];
  }, [appointmentsQuery.data, surgeriesQuery.data]);

  const events = useMemo(() => {
    let list = allEvents;
    if (filters.kind !== "all")
      list = list.filter((event) => event.kind === filters.kind);
    if (filters.doctorIds.length > 0)
      list = list.filter(
        (event) => event.doctorId && filters.doctorIds.includes(event.doctorId),
      );
    if (filters.appointmentStatuses.length > 0)
      list = list.filter(
        (event) =>
          event.kind !== "appointment" ||
          (event.status != null && filters.appointmentStatuses.includes(event.status)),
      );
    if (filters.appointmentTypes.length > 0)
      list = list.filter(
        (event) =>
          event.kind !== "appointment" ||
          (event.appointment != null && filters.appointmentTypes.includes(event.appointment.type)),
      );
    if (filters.clinicIds.length > 0)
      list = list.filter(
        (event) =>
          event.kind !== "appointment" ||
          (event.appointment?.clinicId != null && filters.clinicIds.includes(event.appointment.clinicId)),
      );
    return list;
  }, [allEvents, filters]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentService.updateStatus(id, status),
    onMutate: ({ id }) => setBusyId(id),
    onSuccess: () => {
      showSuccess("Consulta atualizada.");
      setDetail(null);
      invalidateAppointments();
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
      invalidateAppointments();
    },
    onError: (err) =>
      showError(getApiErrorMessage(err, "Não foi possível excluir.")),
    onSettled: () => setBusyId(null),
  });

  // ── Interações ──────────────────────────────────────────────────────────────
  const handleEventClick = (ev: CalEvent) => {
    if (ev.kind === "appointment" && ev.appointment) {
      setDetail(ev.appointment);
    } else if (ev.surgery) {
      router.push(`/solicitacao/${ev.surgery.id}`);
    }
  };

  const handleSlotClick = (date: Date) => {
    setNewModal({ date: dateKey(date), time: hhmm(date) });
  };

  const navigate = (dir: -1 | 1) => {
    setAnchor((a) =>
      view === "month"
        ? addMonths(a, dir)
        : addDays(a, dir * (view === "week" ? 7 : 1)),
    );
  };

  const title = useMemo(() => {
    if (view === "day") {
      return `${anchor.getDate()} de ${MONTHS[anchor.getMonth()]} de ${anchor.getFullYear()}`;
    }
    if (view === "month") {
      return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    }
    const s = days[0];
    const e = days[6];
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} – ${e.getDate()} de ${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
    }
    return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`;
  }, [view, anchor, days]);

  const exportDefaults = useMemo(() => {
    const key = (d: Date) => dateKey(d);
    return { from: key(rangeFrom), to: key(addDays(rangeTo, -1)) };
  }, [rangeFrom, rangeTo]);

  const VIEW_TABS: { key: CalView; label: string }[] = [
    { key: "day", label: "Dia" },
    { key: "week", label: "Semana" },
    { key: "month", label: "Mês" },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col h-full overflow-hidden">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 px-3 lg:px-6 py-2.5 border-b border-neutral-100 shrink-0">
          {/* Linha 1: navegação + data + ações */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
                aria-label="Anterior"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                onClick={() => navigate(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
                aria-label="Próximo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <DatePickerPopover
              className="flex-1 min-w-0"
              value={anchor}
              onChange={setAnchor}
              trigger={
                <button
                  className="flex items-center gap-1 h-8 pl-1.5 pr-1 rounded-lg hover:bg-neutral-50 transition-colors min-w-0 max-w-full"
                  title="Escolher data"
                >
                  <h1 className="text-sm lg:text-base font-bold text-neutral-900 capitalize truncate">
                    {title}
                  </h1>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400 shrink-0">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              }
            />

            {loading && (
              <span className="shrink-0">
                <Loading size="sm" />
              </span>
            )}

            <button
              onClick={() => setNewModal({})}
              data-tour="agenda-nova-consulta"
              className="flex items-center gap-1.5 h-8 px-2 sm:px-3 rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors shrink-0"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-xs font-semibold hidden sm:inline">Nova consulta</span>
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              data-tour="agenda-exportar"
              className="flex items-center justify-center w-8 h-8 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors shrink-0"
              title="Exportar"
              aria-label="Exportar agenda"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>

            <button
              onClick={refetchAll}
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-50 transition-colors disabled:opacity-40 shrink-0"
              title="Atualizar"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? "animate-spin" : ""}>
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>

          {/* Linha 2: Hoje + visão + filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setAnchor(new Date())}
              className="h-8 px-3 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors shrink-0"
            >
              Hoje
            </button>

            <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 shrink-0">
              {VIEW_TABS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-colors",
                    view === v.key
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-800",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-neutral-200 hidden sm:block" />

            {(() => {
              const activeCount = countActiveAgendaFilters(filters);
              return (
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(true)}
                  data-tour="agenda-filtros"
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-colors shrink-0",
                    activeCount > 0
                      ? "border-teal-600 bg-teal-50 text-teal-700 hover:bg-teal-100"
                      : "border-neutral-200 text-neutral-700 hover:bg-neutral-50",
                  )}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                  Filtro
                  {activeCount > 0 && <span className="min-w-4 h-4 px-1 rounded-full bg-teal-700 text-white text-[10px] inline-flex items-center justify-center">{activeCount}</span>}
                </button>
              );
            })()}
          </div>
        </div>

        {/* ── Corpo ──────────────────────────────────────────────── */}
        {isError ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 px-4">
            <p className="text-sm text-red-500 text-center">
              Não foi possível carregar a agenda.
            </p>
            <button
              onClick={refetchAll}
              className="text-sm text-teal-600 hover:text-teal-800 underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : view === "month" ? (
          <CalendarMonthView
            anchor={anchor}
            events={events}
            onEventClick={handleEventClick}
            onSelectDay={(day) => {
              setAnchor(day);
              setView("day");
            }}
          />
        ) : (
          <CalendarTimeGrid
            days={days}
            events={events}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
          />
        )}
      </div>

      <AgendaFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={setFilters}
        onClear={() => setFilters(DEFAULT_AGENDA_FILTERS)}
        currentFilters={filters}
        doctors={doctors}
        clinics={clinics}
        canFilterSurgeries={podeVerCirurgias}
      />

      {/* ── Modais ─────────────────────────────────────────────── */}
      {newModal && (
        <NewAppointmentModal
          isOpen
          onClose={() => setNewModal(null)}
          onSaved={() => {
            showSuccess(
              newModal.appointment ? "Consulta atualizada." : "Consulta agendada.",
            );
            invalidateAppointments();
          }}
          defaultDate={newModal.date ?? null}
          defaultTime={newModal.time ?? null}
          appointment={newModal.appointment ?? null}
        />
      )}

      {detail && (
        <AppointmentDetailModal
          appointment={detail}
          doctorName={
            detail.doctorId ? doctorNameById.get(detail.doctorId) : undefined
          }
          busy={busyId === detail.id}
          onClose={() => setDetail(null)}
          onEdit={() => {
            const appt = detail;
            setDetail(null);
            setNewModal({ appointment: appt });
          }}
          onStartAttendance={() => router.push(`/atendimento/${detail.id}`)}
          onChangeStatus={(status) =>
            statusMutation.mutate({ id: detail.id, status })
          }
          onDelete={() => deleteMutation.mutate(detail.id)}
        />
      )}

      <AgendaExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        defaultFrom={exportDefaults.from}
        defaultTo={exportDefaults.to}
        availableDoctors={doctors}
        defaultDoctorIds={filters.doctorIds}
        canExportSurgeries={podeVerCirurgias}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </PageContainer>
  );
}
