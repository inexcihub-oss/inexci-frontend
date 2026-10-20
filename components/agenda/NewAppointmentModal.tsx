"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { SelectSearch } from "@/components/ui/SelectSearch";
import { DateInput } from "@/components/ui/DateInput";
import { DatePickerPopover } from "@/components/ui/DatePickerPopover";
import { NewPatientModal } from "@/components/patients/NewPatientModal";
import { patientService } from "@/services/patient.service";
import {
  appointmentService,
  Appointment,
  AppointmentType,
  APPOINTMENT_TYPE_LABELS,
  ocupaAgenda,
} from "@/services/appointment.service";
import { useAvailableDoctors } from "@/hooks/useAvailableDoctors";
import { useClinics } from "@/hooks/useClinics";
import { useClinicRooms } from "@/hooks/useClinicRooms";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { TOUR_DEMO_APPOINTMENT_ID } from "@/lib/onboarding/demo-data";
import { mensagemForaDoHorario } from "@/lib/business-hours";
import { getApiErrorMessage } from "@/lib/http-error";
import { cn } from "@/lib/utils";
import {
  bloqueioNoHorario,
  dentroDaGrade,
  SLOT_REASON_LABELS,
} from "@/lib/availability";
import {
  availabilityService,
  AvailabilityDay,
  AvailabilitySlot,
  ScheduleBlock,
} from "@/services/availability.service";
import { dateKey, hhmm } from "@/lib/calendar";
import { CalendarDays, UserPlus, AlertTriangle } from "lucide-react";

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (salva?: Appointment) => void;
  defaultDate?: string | null;
  defaultTime?: string | null;
  appointment?: Appointment | null;
  defaultPatientId?: string;
  defaultPatientLabel?: string;
  defaultHealthPlanId?: string | null;
}

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function isoToLocalParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function partsToIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function NewAppointmentModal({
  isOpen,
  onClose,
  onSaved,
  defaultDate,
  defaultTime,
  appointment,
  defaultPatientId,
  defaultPatientLabel,
  defaultHealthPlanId,
}: NewAppointmentModalProps) {
  const isEdit = !!appointment;
  const { data: doctors = [] } = useAvailableDoctors();
  const { data: clinics = [] } = useClinics();
  const { data: healthPlans = [] } = useHealthPlans();
  const { emTour } = useOnboarding();
  const dadosFabricados = appointment?.id === TOUR_DEMO_APPOINTMENT_ID;

  const [patientId, setPatientId] = useState("");
  const [patientLabel, setPatientLabel] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [roomId, setRoomId] = useState("");
  const origemClinica = useRef<"grade" | "manual" | null>(null);
  const [healthPlanId, setHealthPlanId] = useState("");
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [convenioEscolhido, setConvenioEscolhido] = useState(false);
  const convenioDoPaciente = useRef(new Map<string, string | null>());
  const [type, setType] = useState<AppointmentType>("first_visit");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [diaDaGrade, setDiaDaGrade] = useState<AvailabilityDay | null>(null);
  const [bloqueiosDoDia, setBloqueiosDoDia] = useState<ScheduleBlock[]>([]);
  const [bloqueiosFalharam, setBloqueiosFalharam] = useState(false);
  const [newPatientOpen, setNewPatientOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const parsed = parseDate(date);
    if (!parsed || !doctorId) {
      setDayAppointments([]);
      return;
    }
    let active = true;
    const from = new Date(parsed);
    from.setHours(0, 0, 0, 0);
    const to = new Date(parsed);
    to.setHours(23, 59, 59, 999);
    appointmentService
      .getAgenda({
        from: from.toISOString(),
        to: to.toISOString(),
        doctorId,
      })
      .then((list) => {
        if (!active) return;
        setDayAppointments(
          list
            .filter((a) => a.id !== appointment?.id && ocupaAgenda(a.status))
            .sort(
              (a, b) =>
                new Date(a.scheduledAt).getTime() -
                new Date(b.scheduledAt).getTime(),
            ),
        );
      })
      .catch(() => active && setDayAppointments([]));
    return () => {
      active = false;
    };
  }, [isOpen, date, doctorId, appointment?.id]);

  useEffect(() => {
    if (!isOpen || !doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setDiaDaGrade(null);
      return;
    }
    let active = true;
    availabilityService
      .getSlots({ doctorId, from: date, to: date })
      .then((dias) => active && setDiaDaGrade(dias[0] ?? null))
      .catch(() => active && setDiaDaGrade(null));
    return () => {
      active = false;
    };
  }, [isOpen, date, doctorId]);

  useEffect(() => {
    const inicioDoDia = parseDate(date);
    setBloqueiosFalharam(false);
    if (!isOpen || !doctorId || !inicioDoDia) {
      setBloqueiosDoDia([]);
      return;
    }
    const fimDoDia = new Date(inicioDoDia);
    fimDoDia.setDate(fimDoDia.getDate() + 1);
    let active = true;
    availabilityService
      .getBlocks({
        doctorId,
        from: inicioDoDia.toISOString(),
        to: fimDoDia.toISOString(),
      })
      .then((bloqueios) => active && setBloqueiosDoDia(bloqueios))
      .catch(() => {
        if (!active) return;
        setBloqueiosDoDia([]);
        setBloqueiosFalharam(true);
      });
    return () => {
      active = false;
    };
  }, [isOpen, date, doctorId]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setConvenioEscolhido(false);
    origemClinica.current = null;
    if (appointment) {
      const { date: d, time: t } = isoToLocalParts(appointment.scheduledAt);
      setPatientId(appointment.patientId);
      setPatientLabel(appointment.patient?.name ?? "");
      setDoctorId(appointment.doctorId);
      setClinicId(appointment.clinicId ?? "");
      setRoomId(appointment.roomId ?? "");
      setHealthPlanId(appointment.healthPlanId ?? "");
      setIsWalkIn(appointment.isWalkIn ?? false);
      setType(appointment.type);
      setDate(d);
      setTime(t);
      setDuration(appointment.durationMinutes);
      setNotes(appointment.notes ?? "");
    } else {
      setPatientId(defaultPatientId ?? "");
      setPatientLabel(defaultPatientLabel ?? "");
      setDoctorId("");
      setClinicId("");
      setRoomId("");
      setHealthPlanId(defaultHealthPlanId ?? "");
      setIsWalkIn(false);
      setType("first_visit");
      setDate(defaultDate ?? "");
      setTime(defaultTime ?? "09:00");
      setDuration(30);
      setNotes("");
    }
  }, [
    isOpen,
    appointment,
    defaultDate,
    defaultTime,
    defaultPatientId,
    defaultPatientLabel,
    defaultHealthPlanId,
  ]);

  useEffect(() => {
    if (!isOpen || appointment) return;
    if (doctors.length === 1) setDoctorId(doctors[0].id);
  }, [isOpen, appointment, doctors]);

  const searchPatients = useCallback(async (term: string) => {
    const { records } = await patientService.list({ search: term, take: 20 });
    for (const p of records) {
      convenioDoPaciente.current.set(p.id, p.healthPlanId ?? null);
    }
    return records.map((p) => ({ value: p.id, label: p.name }));
  }, []);

  const { data: roomsDaClinica = [] } = useClinicRooms(clinicId || null);
  const salas = useMemo(
    () =>
      roomsDaClinica.filter(
        (r) => r.active || (isEdit && r.id === appointment?.roomId),
      ),
    [roomsDaClinica, isEdit, appointment?.roomId],
  );

  const escolherHorarioDaGrade = (slot: AvailabilitySlot, rotulo: string) => {
    setTime(rotulo);
    if (!slot.clinicId) return;
    const podePreencher =
      origemClinica.current === "grade" ||
      (origemClinica.current === null && !clinicId);
    if (!podePreencher) return;
    setClinicId(slot.clinicId);
    setRoomId(slot.roomId ?? "");
    origemClinica.current = "grade";
  };

  const canSubmit = useMemo(
    () => !!patientId && !!doctorId && !!date && /^\d{2}:\d{2}$/.test(time),
    [patientId, doctorId, date, time],
  );

  const avisoHorario = useMemo(() => {
    const clinica = clinics.find((c) => c.id === clinicId);
    if (!clinica) return null;
    const parsed = parseDate(date);
    if (!parsed || !/^\d{2}:\d{2}$/.test(time)) return null;

    const [hh, mm] = time.split(":").map(Number);
    const inicio = new Date(parsed);
    inicio.setHours(hh, mm, 0, 0);

    return mensagemForaDoHorario(
      clinica.name,
      clinica.businessHours,
      inicio,
      duration,
    );
  }, [clinics, clinicId, date, time, duration]);

  const mudouHorario = useMemo(() => {
    if (!isEdit || !appointment) return true;
    if (duration !== appointment.durationMinutes) return true;
    if (!parseDate(date) || !/^\d{2}:\d{2}$/.test(time)) return true;
    return (
      new Date(partsToIso(date, time)).getTime() !==
      new Date(appointment.scheduledAt).getTime()
    );
  }, [isEdit, appointment, date, time, duration]);

  const mudouClinica =
    isEdit && !!appointment
      ? (clinicId || null) !== (appointment.clinicId ?? null)
      : true;

  const ocupaHorario =
    !isEdit || !appointment ? true : ocupaAgenda(appointment.status);
  const conferirGrade = ocupaHorario && (mudouHorario || mudouClinica);

  const bloqueioGrade = useMemo(() => {
    if (!conferirGrade) return null;
    if (diaDaGrade?.holiday?.blocksAgenda) {
      return `Feriado (${diaDaGrade.holiday.name}): a agenda está bloqueada neste dia.`;
    }
    const parsed = parseDate(date);
    if (!parsed || !/^\d{2}:\d{2}$/.test(time)) return null;
    const [hh, mm] = time.split(":").map(Number);
    const inicio = new Date(parsed);
    inicio.setHours(hh, mm, 0, 0);
    const bloqueio = bloqueioNoHorario(
      bloqueiosDoDia,
      doctorId,
      clinicId || null,
      inicio,
      duration,
    );
    if (bloqueio) {
      return bloqueio.reason
        ? `Horário bloqueado na agenda do profissional (${bloqueio.reason}): não será possível agendar.`
        : "Horário bloqueado na agenda do profissional: não será possível agendar.";
    }
    if (!diaDaGrade || !bloqueiosFalharam) return null;
    const fim = inicio.getTime() + duration * 60_000;
    const bloqueado = diaDaGrade.slots.some(
      (s) =>
        s.reason === "block" &&
        new Date(s.start).getTime() < fim &&
        inicio.getTime() < new Date(s.end).getTime(),
    );
    return bloqueado
      ? "Horário bloqueado na agenda do profissional: não será possível agendar."
      : null;
  }, [
    diaDaGrade,
    bloqueiosDoDia,
    bloqueiosFalharam,
    doctorId,
    clinicId,
    conferirGrade,
    date,
    time,
    duration,
  ]);

  const avisoGrade = useMemo(() => {
    if (!diaDaGrade || bloqueioGrade || !(mudouHorario || mudouClinica))
      return null;
    const parsed = parseDate(date);
    if (!parsed || !/^\d{2}:\d{2}$/.test(time)) return null;
    const [hh, mm] = time.split(":").map(Number);
    const inicio = new Date(parsed);
    inicio.setHours(hh, mm, 0, 0);
    return dentroDaGrade(diaDaGrade.slots, inicio, duration) === false
      ? "Fora da grade de atendimento do profissional."
      : null;
  }, [
    diaDaGrade,
    bloqueioGrade,
    mudouHorario,
    mudouClinica,
    date,
    time,
    duration,
  ]);

  const convenioSugerido = (id: string | null | undefined): string =>
    id && healthPlans.some((hp) => hp.id === id) ? id : "";

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError("Preencha paciente, médico, data e horário.");
      return;
    }
    setSaving(true);
    setError(null);
    let salva: Appointment | undefined;
    try {
      const scheduledAt = partsToIso(date, time);
      if (isEdit && appointment) {
        const mudouSala = (roomId || null) !== (appointment.roomId ?? null);
        const mudouConvenio =
          (healthPlanId || null) !== (appointment.healthPlanId ?? null);
        salva = await appointmentService.update(appointment.id, {
          type,
          notes,
          ...(mudouHorario ? { scheduledAt, durationMinutes: duration } : {}),
          ...(mudouClinica ? { clinicId: clinicId || null } : {}),
          ...(mudouSala ? { roomId: roomId || null } : {}),
          ...(mudouConvenio ? { healthPlanId: healthPlanId || null } : {}),
          ...(isWalkIn !== (appointment.isWalkIn ?? false) ? { isWalkIn } : {}),
        });
      } else {
        salva = await appointmentService.create({
          patientId,
          doctorId,
          type,
          scheduledAt,
          durationMinutes: duration,
          notes,
          clinicId: clinicId || null,
          roomId: roomId || null,
          healthPlanId: healthPlanId || null,
          isWalkIn,
        });
      }
      onSaved(salva);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível salvar a consulta."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Editar consulta" : "Nova consulta"}
      size="sm"
    >
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="ds-label mb-0">
              Paciente<span className="text-red-500 ml-0.5">*</span>
            </label>
            {!isEdit && (
              <button
                type="button"
                onClick={() => setNewPatientOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Novo paciente
              </button>
            )}
          </div>
          <SelectSearch
            value={patientId}
            initialLabel={patientLabel}
            onChange={(v, label) => {
              setPatientId(v);
              setPatientLabel(label ?? "");
              if (!convenioEscolhido) {
                setHealthPlanId(
                  convenioSugerido(convenioDoPaciente.current.get(v)),
                );
              }
            }}
            onSearch={searchPatients}
            placeholder="Buscar paciente pelo nome..."
            ariaLabel="Paciente"
            disabled={isEdit}
          />
        </div>

        {doctors.length > 1 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="consulta-profissional" className="ds-label mb-0">
              Profissional<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select
              id="consulta-profissional"
              className="ds-input"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              disabled={isEdit}
            >
              <option value="">Selecione o profissional</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.specialty ? ` — ${d.specialty}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="clinica" className="ds-label mb-0">
            Clínica
          </label>
          <select
            id="clinica"
            className="ds-input"
            value={clinicId}
            onChange={(e) => {
              setClinicId(e.target.value);
              setRoomId("");
              origemClinica.current = "manual";
            }}
          >
            <option value="">Nenhuma</option>
            {appointment?.clinic &&
              !clinics.some((c) => c.id === appointment.clinic!.id) && (
                <option value={appointment.clinic.id} disabled>
                  {appointment.clinic.name} (excluída)
                </option>
              )}
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {clinicId && salas.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="sala" className="ds-label mb-0">
              Sala
            </label>
            <select
              id="sala"
              className="ds-input"
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                origemClinica.current = "manual";
              }}
            >
              <option value="">Sem sala definida</option>
              {salas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.active ? "" : " (desativada)"}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="convenio-consulta" className="ds-label mb-0">
            Convênio
          </label>
          <select
            id="convenio-consulta"
            className="ds-input"
            value={healthPlanId}
            onChange={(e) => {
              setHealthPlanId(e.target.value);
              setConvenioEscolhido(true);
            }}
          >
            <option value="">Particular</option>
            {healthPlans.map((hp) => (
              <option key={hp.id} value={hp.id}>
                {hp.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="consulta-tipo" className="ds-label mb-0">
            Tipo
          </label>
          <select
            id="consulta-tipo"
            className="ds-input"
            value={type}
            onChange={(e) => setType(e.target.value as AppointmentType)}
          >
            {(
              Object.keys(APPOINTMENT_TYPE_LABELS) as AppointmentType[]
            ).map((t) => (
              <option key={t} value={t}>
                {APPOINTMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3" data-tour="agenda-modal-horario">
          <div className="flex flex-col gap-1">
            <label htmlFor="consulta-data" className="ds-label mb-0">
              Data<span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="flex items-stretch gap-2">
              <div className="flex-1">
                <DateInput
                  id="consulta-data"
                  value={date}
                  onChange={setDate}
                  required
                />
              </div>
              <DatePickerPopover
                value={parseDate(date)}
                onChange={(d) => setDate(dateKey(d))}
                align="right"
                trigger={
                  <button
                    type="button"
                    className="ds-input !w-10 flex items-center justify-center text-neutral-500 hover:bg-neutral-50"
                    title="Escolher no calendário"
                    aria-label="Escolher no calendário"
                  >
                    <CalendarDays className="w-4 h-4" />
                  </button>
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="horario" className="ds-label mb-0">
              Horário<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="horario"
              type="time"
              className="ds-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        {diaDaGrade && diaDaGrade.slots.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-neutral-500">
              Horários da grade
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Horários da grade">
              {diaDaGrade.slots.map((slot) => {
                const rotulo = hhmm(new Date(slot.start));
                const escolhido = rotulo === time;
                const indisponivel =
                  !slot.free &&
                  slot.reason !== "block" &&
                  (!isWalkIn || slot.reason === "holiday");
                return (
                  <button
                    key={slot.start}
                    type="button"
                    disabled={indisponivel}
                    aria-pressed={escolhido}
                    aria-label={
                      slot.free
                        ? rotulo
                        : `${rotulo} (${SLOT_REASON_LABELS[slot.reason ?? "appointment"]})`
                    }
                    title={slot.free ? undefined : SLOT_REASON_LABELS[slot.reason ?? "appointment"]}
                    onClick={() => escolherHorarioDaGrade(slot, rotulo)}
                    className={cn(
                      "px-3 py-1 rounded-full border text-xs font-semibold tabular-nums min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-0",
                      escolhido
                        ? "bg-teal-700 text-white border-teal-700"
                        : slot.free
                          ? "border-teal-200 text-teal-800 hover:bg-teal-50"
                          : indisponivel
                            ? "border-neutral-200 text-neutral-400 line-through cursor-not-allowed"
                            : "border-amber-200 text-amber-800 hover:bg-amber-50",
                    )}
                  >
                    {rotulo}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isWalkIn}
            onChange={(e) => setIsWalkIn(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-teal-600"
          />
          <span className="text-sm text-neutral-700">
            Encaixe
            <span className="block text-xs text-neutral-500">
              Marca mesmo havendo outra consulta no mesmo período.
            </span>
          </span>
        </label>

        {dayAppointments.length > 0 && (
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-neutral-500 mb-1.5">
              Consultas nesse dia ({dayAppointments.length})
            </p>
            <div className="flex flex-col gap-1">
              {dayAppointments.map((a) => {
                const start = new Date(a.scheduledAt);
                const end = new Date(
                  start.getTime() + a.durationMinutes * 60_000,
                );
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 text-xs text-neutral-600"
                  >
                    <span className="font-semibold text-neutral-800 tabular-nums">
                      {hhmm(start)}–{hhmm(end)}
                    </span>
                    <span className="truncate">
                      {a.patient?.name ?? "Consulta"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="consulta-duracao" className="ds-label mb-0">
            Duração
          </label>
          <select
            id="consulta-duracao"
            className="ds-input"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="consulta-observacoes" className="ds-label mb-0">
            Observações
          </label>
          <textarea
            id="consulta-observacoes"
            className="ds-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Motivo da consulta, orientações, etc."
            rows={3}
          />
        </div>

        {bloqueioGrade && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-xs text-red-700">
              {bloqueioGrade} Escolha outra data ou horário.
            </p>
          </div>
        )}

        {[conferirGrade ? avisoHorario : null, avisoGrade].filter(Boolean).map((aviso) => (
          <div
            key={aviso}
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">{aviso}</p>
          </div>
        ))}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <ModalFooter align="end">
        <SpinnerButton variant="secondary" onClick={onClose}>
          Cancelar
        </SpinnerButton>
        <SpinnerButton
          variant="primary"
          onClick={handleSubmit}
          isLoading={saving}
          disabled={
            !canSubmit || emTour || dadosFabricados || Boolean(bloqueioGrade)
          }
          loadingText="Salvando..."
        >
          {!bloqueioGrade && ((conferirGrade && avisoHorario) || avisoGrade)
            ? "Agendar mesmo assim"
            : isEdit
              ? "Salvar alterações"
              : "Agendar consulta"}
        </SpinnerButton>
      </ModalFooter>
    </Modal>

      <NewPatientModal
        isOpen={newPatientOpen}
        onClose={() => setNewPatientOpen(false)}
        onSuccess={(patient) => {
          setPatientId(patient.id);
          setPatientLabel(patient.name);
          if (!convenioEscolhido) {
            setHealthPlanId(convenioSugerido(patient.healthPlanId));
          }
          setNewPatientOpen(false);
        }}
      />
    </>
  );
}
