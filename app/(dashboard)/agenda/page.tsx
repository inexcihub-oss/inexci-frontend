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
import {
  AgendaBlockOverlay,
  CalendarTimeGrid,
} from "@/components/agenda/CalendarTimeGrid";
import { ScheduleBlockModal } from "@/components/agenda/ScheduleBlockModal";
import {
  availabilityService,
  ScheduleBlock,
} from "@/services/availability.service";
import {
  AVAILABILITY_QUERY_KEYS,
  blockAppliesTo,
  bloqueioNoDia,
  holidayOn,
} from "@/lib/availability";
import { formatDoctorName } from "@/lib/formatters";
import {
  AgendaDayMark,
  CalendarMonthView,
} from "@/components/agenda/CalendarMonthView";
import { useAvailableDoctors } from "@/hooks/useAvailableDoctors";
import { useClinics } from "@/hooks/useClinics";
import { useAppointmentsFinanceStatus } from "@/hooks/useAppointmentFinanceStatus";
import type { ReceivableStatus } from "@/types/finance.types";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/http-error";
import { cn } from "@/lib/utils";
import {
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ListFilter,
  Plus,
  RefreshCw,
} from "lucide-react";
import { appointmentKeys, surgeryRequestKeys } from "@/lib/query-keys";
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
  isToday,
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
  const { showSuccess, showError } = useToast();
  const { can, user } = useAuth();
  const podeVerCirurgias = can(Permission.SOLICITACOES);
  const podeAgenda = can(Permission.AGENDA);
  const podeBloquearClinica = can(Permission.ADMINISTRACAO);
  const podeFinanceiro = can(Permission.FINANCEIRO);

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
  const [blockModal, setBlockModal] = useState<{
    block?: ScheduleBlock;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useOnboardingAction("agenda-abrir-novo-horario", () => {
    setDetail(null);
    setIsFilterOpen(false);
    setIsExportOpen(false);
    setNewModal({});
  });

  useOnboardingAction("agenda-abrir-detalhe-demo", () => {
    setNewModal(null);
    setIsFilterOpen(false);
    setIsExportOpen(false);
    setDetail(criarConsultaDemo(user?.doctorProfile?.id ?? ""));
  });

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
  const physicianById = useMemo(
    () => new Map(doctors.map((d) => [d.id, d.isPhysician] as const)),
    [doctors],
  );

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
    queryKey: surgeryRequestKeys.agendaRange(fromISO, toISO),
    queryFn: () => surgeryRequestService.getAgenda(fromISO, toISO),
    placeholderData: keepPreviousData,
    enabled: podeVerCirurgias,
  });
  const appointmentsQuery = useQuery({
    queryKey: appointmentKeys.agenda(fromISO, toISO),
    queryFn: () =>
      appointmentService.getAgendaCompleta({ from: fromISO, to: toISO }),
    placeholderData: keepPreviousData,
  });
  const agendaIncompleta =
    !!appointmentsQuery.data &&
    appointmentsQuery.data.total > appointmentsQuery.data.records.length;

  const idsDasConsultas = useMemo(
    () => (appointmentsQuery.data?.records ?? []).map((a) => a.id),
    [appointmentsQuery.data],
  );
  const { porConsulta: financeiroPorConsulta } = useAppointmentsFinanceStatus(
    idsDasConsultas,
    podeFinanceiro,
  );
  const statusFinanceiro = useMemo(() => {
    const mapa = new Map<string, ReceivableStatus>();
    financeiroPorConsulta.forEach((v, k) => mapa.set(k, v.status));
    return mapa;
  }, [financeiroPorConsulta]);

  const blocksQuery = useQuery({
    queryKey: [...AVAILABILITY_QUERY_KEYS.blocks, fromISO, toISO],
    queryFn: () => availabilityService.getBlocks({ from: fromISO, to: toISO }),
    placeholderData: keepPreviousData,
  });
  const holidaysQuery = useQuery({
    queryKey: AVAILABILITY_QUERY_KEYS.holidays,
    queryFn: () => availabilityService.getHolidays(),
    staleTime: 1000 * 60 * 30,
  });

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
    queryClient.invalidateQueries({ queryKey: appointmentKeys.all });

  const allEvents = useMemo<CalEvent[]>(() => {
    const appts = (appointmentsQuery.data?.records ?? []).map((a) =>
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
          (event.status != null &&
            filters.appointmentStatuses.includes(event.status)),
      );
    if (filters.appointmentTypes.length > 0)
      list = list.filter(
        (event) =>
          event.kind !== "appointment" ||
          (event.appointment != null &&
            filters.appointmentTypes.includes(event.appointment.type)),
      );
    if (filters.clinicIds.length > 0)
      list = list.filter(
        (event) =>
          event.kind !== "appointment" ||
          (event.appointment?.clinicId != null &&
            filters.clinicIds.includes(event.appointment.clinicId)),
      );
    return list;
  }, [allEvents, filters]);

  const clinicNameById = useMemo(
    () => new Map(clinics.map((c) => [c.id, c.name] as const)),
    [clinics],
  );

  const blocosVisiveis = useMemo(
    () =>
      (blocksQuery.data ?? [])
        .filter((b) => blockAppliesTo(b, filters.doctorIds))
        .map((b) => {
          const quem = b.doctorId
            ? formatDoctorName(
                doctorNameById.get(b.doctorId) ?? "Profissional",
                physicianById.get(b.doctorId) ?? false,
              )
            : b.clinicId
              ? (clinicNameById.get(b.clinicId) ?? "Clínica")
              : "Clínica";
          return {
            block: b,
            label: `${quem}: ${b.reason ?? "bloqueado"}`,
            onClick:
              podeAgenda && (b.doctorId || podeBloquearClinica)
                ? () => setBlockModal({ block: b })
                : undefined,
          };
        }),
    [
      blocksQuery.data,
      filters.doctorIds,
      doctorNameById,
      physicianById,
      clinicNameById,
      podeAgenda,
      podeBloquearClinica,
    ],
  );

  const feriadoQueTrava = useCallback(
    (day: Date) => {
      const feriado = holidayOn(holidaysQuery.data ?? [], dateKey(day));
      return feriado?.blocksAgenda ? feriado : undefined;
    },
    [holidaysQuery.data],
  );

  const blockOverlays = useMemo<AgendaBlockOverlay[]>(() => {
    const overlays: AgendaBlockOverlay[] = blocosVisiveis.map(
      ({ block: b, label, onClick }) => ({
        id: b.id,
        start: new Date(b.startsAt),
        end: new Date(b.endsAt),
        label,
        onClick,
      }),
    );
    for (const day of days) {
      const feriado = feriadoQueTrava(day);
      if (!feriado) continue;
      const fim = addDays(day, 1);
      overlays.push({
        id: `feriado-${dateKey(day)}`,
        start: startOfDay(day),
        end: startOfDay(fim),
        label: `Feriado: ${feriado.name}`,
      });
    }
    return overlays;
  }, [blocosVisiveis, days, feriadoQueTrava]);

  const monthDayMarks = useMemo<Record<string, AgendaDayMark[]>>(() => {
    if (view !== "month") return {};
    const marks: Record<string, AgendaDayMark[]> = {};
    for (let i = 0; i < 42; i++) {
      const day = addDays(rangeFrom, i);
      const key = dateKey(day);
      const lista: AgendaDayMark[] = [];
      const feriado = feriadoQueTrava(day);
      if (feriado) {
        lista.push({
          id: `feriado-${key}`,
          kind: "holiday",
          label: `Feriado: ${feriado.name}`,
        });
      }
      for (const { block, label, onClick } of blocosVisiveis) {
        if (!bloqueioNoDia(block, day)) continue;
        lista.push({ id: `${block.id}-${key}`, kind: "block", label, onClick });
      }
      if (lista.length) marks[key] = lista;
    }
    return marks;
  }, [view, rangeFrom, blocosVisiveis, feriadoQueTrava]);

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

  const shortTitle = useMemo(() => {
    if (view === "day") {
      return `${anchor.getDate()} ${MONTHS_SHORT[anchor.getMonth()]} ${anchor.getFullYear()}`;
    }
    if (view === "month") return title;
    const s = days[0];
    const e = days[6];
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} – ${e.getDate()} ${MONTHS_SHORT[s.getMonth()]} ${s.getFullYear()}`;
    }
    return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]}`;
  }, [view, anchor, days, title]);

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
        <div className="flex flex-col gap-2 px-3 lg:px-6 py-2.5 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-1.5">
            <DatePickerPopover
              className="flex-1 min-w-0"
              value={anchor}
              onChange={setAnchor}
              trigger={
                <button
                  type="button"
                  className="flex h-10 md:h-9 min-w-0 max-w-full items-center gap-1 rounded-xl pl-1.5 pr-1 hover:bg-gray-50 transition-colors"
                  title="Escolher data"
                >
                  <h1 className="text-sm md:text-base font-bold text-neutral-900 first-letter:uppercase truncate">
                    <span className="sm:hidden" aria-hidden="true">
                      {shortTitle}
                    </span>
                    <span className="hidden sm:inline">{title}</span>
                    <span className="sr-only sm:hidden">{title}</span>
                  </h1>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-gray-400"
                    aria-hidden="true"
                  />
                </button>
              }
            />

            {loading && (
              <span className="shrink-0">
                <Loading size="sm" />
              </span>
            )}

            <button
              type="button"
              onClick={() => setNewModal({})}
              data-tour="agenda-nova-consulta"
              aria-label="Nova consulta"
              className="ds-toolbar-btn-primary ds-toolbar-icon sm:w-auto sm:px-3"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Nova consulta</span>
            </button>

            {podeAgenda && (
              <button
                type="button"
                onClick={() => setBlockModal({})}
                className="ds-toolbar-btn ds-toolbar-icon md:w-auto md:px-3"
                title="Bloquear horário"
                aria-label="Bloquear horário"
              >
                <Ban className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">Bloquear</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              data-tour="agenda-exportar"
              className="ds-toolbar-btn ds-toolbar-icon"
              title="Exportar"
              aria-label="Exportar agenda"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={refetchAll}
              disabled={loading}
              className="ds-toolbar-btn ds-toolbar-icon hidden md:inline-flex"
              title="Atualizar"
              aria-label="Atualizar"
            >
              <RefreshCw
                className={cn("h-4 w-4", loading && "animate-spin")}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="ds-toolbar-btn"
            >
              Hoje
            </button>

            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-10 w-8 md:h-9 md:w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                className="flex h-10 w-8 md:h-9 md:w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                aria-label="Próximo"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="ds-segmented">
              {VIEW_TABS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setView(v.key)}
                  className={cn(
                    "ds-segmented-item px-2 md:px-3",
                    view === v.key && "ds-segmented-item-active",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {(() => {
              const activeCount = countActiveAgendaFilters(filters);
              return (
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(true)}
                  data-tour="agenda-filtros"
                  aria-label="Filtro"
                  className={cn(
                    "ds-toolbar-btn ds-toolbar-icon sm:w-auto sm:px-3 relative md:ml-auto",
                    activeCount > 0 && "ds-toolbar-btn-active",
                  )}
                >
                  <ListFilter className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Filtro</span>
                  {activeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 sm:static inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-700 px-1 text-[10px] text-white">
                      {activeCount}
                    </span>
                  )}
                </button>
              );
            })()}
          </div>
        </div>

        {agendaIncompleta && appointmentsQuery.data && (
          <div
            role="status"
            className="mx-3 lg:mx-6 mt-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800"
          >
            Mostrando {appointmentsQuery.data.records.length} de{" "}
            {appointmentsQuery.data.total} consultas deste período. Use o filtro
            de profissional ou uma visão menor (dia/semana) para ver todas.
          </div>
        )}

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
            dayMarks={monthDayMarks}
            financeStatusByAppointment={statusFinanceiro}
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
            blocks={blockOverlays}
            financeStatusByAppointment={statusFinanceiro}
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

      {newModal && (
        <NewAppointmentModal
          isOpen
          onClose={() => setNewModal(null)}
          onSaved={(salva) => {
            const base = newModal.appointment
              ? "Consulta atualizada"
              : "Consulta agendada";
            showSuccess(
              salva?.warnings?.includes("fora_da_grade")
                ? `${base} fora da grade de atendimento do profissional.`
                : `${base}.`,
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
          doctorIsPhysician={
            detail.doctorId ? physicianById.get(detail.doctorId) : undefined
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

      {blockModal && (
        <ScheduleBlockModal
          isOpen
          block={blockModal.block ?? null}
          doctors={doctors}
          clinics={clinics}
          podeClinicaToda={podeBloquearClinica}
          defaultDate={
            view === "month"
              ? null
              : dateKey(days.find((d) => isToday(d)) ?? days[0] ?? anchor)
          }
          onClose={() => setBlockModal(null)}
          onSaved={(mensagem) => {
            showSuccess(mensagem);
            queryClient.invalidateQueries({
              queryKey: AVAILABILITY_QUERY_KEYS.blocks,
            });
          }}
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
    </PageContainer>
  );
}
