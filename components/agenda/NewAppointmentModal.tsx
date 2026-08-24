"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@/services/appointment.service";
import { useAvailableDoctors } from "@/hooks/useAvailableDoctors";
import { useClinics } from "@/hooks/useClinics";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { TOUR_DEMO_APPOINTMENT_ID } from "@/lib/onboarding/demo-data";
import { mensagemForaDoHorario } from "@/lib/business-hours";
import { getApiErrorMessage } from "@/lib/http-error";
import { dateKey, hhmm } from "@/lib/calendar";
import { CalendarDays, UserPlus, AlertTriangle } from "lucide-react";

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Data pré-selecionada (YYYY-MM-DD) ao abrir a partir de um dia da agenda. */
  defaultDate?: string | null;
  /** Horário pré-selecionado (HH:mm) ao criar clicando num slot da grade. */
  defaultTime?: string | null;
  /** Consulta em edição; quando ausente, é criação. */
  appointment?: Appointment | null;
  /** Paciente pré-selecionado ao criar (ex.: a partir da ficha do paciente). */
  defaultPatientId?: string;
  defaultPatientLabel?: string;
}

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** ISO → { date: YYYY-MM-DD, time: HH:mm } em horário local. */
function isoToLocalParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** { date, time } locais → ISO (UTC). */
function partsToIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

/** "YYYY-MM-DD" → Date local, ou null se incompleto. */
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
}: NewAppointmentModalProps) {
  const isEdit = !!appointment;
  const { data: doctors = [] } = useAvailableDoctors();
  const { data: clinics = [] } = useClinics();
  const { emTour } = useOnboarding();
  // Guarda por PROVENIÊNCIA, não só pelo estado do tour: editar a consulta
  // fabricada continua bloqueado mesmo depois que o tour termina.
  const dadosFabricados = appointment?.id === TOUR_DEMO_APPOINTMENT_ID;

  const [patientId, setPatientId] = useState("");
  const [patientLabel, setPatientLabel] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [type, setType] = useState<AppointmentType>("first_visit");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [newPatientOpen, setNewPatientOpen] = useState(false);

  // Busca as consultas já marcadas no dia/médico selecionado (para o usuário
  // ver os horários ocupados antes de escolher). Ignora a própria em edição.
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
            .filter((a) => a.id !== appointment?.id && a.status !== "cancelled")
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

  // Preenche o formulário ao abrir (edição ou defaults de criação).
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (appointment) {
      const { date: d, time: t } = isoToLocalParts(appointment.scheduledAt);
      setPatientId(appointment.patientId);
      setPatientLabel(appointment.patient?.name ?? "");
      setDoctorId(appointment.doctorId);
      setClinicId(appointment.clinicId ?? "");
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
  ]);

  /**
   * Autosseleção do médico quando só existe um acessível. Fica em efeito
   * próprio porque `doctors` chega assíncrono: mantê-lo nas dependências do
   * efeito de preenchimento fazia o formulário inteiro ser rebobinado a cada
   * render enquanto a lista não tinha carregado — apagando, entre outras
   * coisas, a clínica que o usuário acabara de escolher.
   */
  useEffect(() => {
    if (!isOpen || appointment) return;
    if (doctors.length === 1) setDoctorId(doctors[0].id);
  }, [isOpen, appointment, doctors]);

  const searchPatients = useCallback(async (term: string) => {
    const { records } = await patientService.list({ search: term, take: 20 });
    return records.map((p) => ({ value: p.id, label: p.name }));
  }, []);

  const canSubmit = useMemo(
    () => !!patientId && !!doctorId && !!date && /^\d{2}:\d{2}$/.test(time),
    [patientId, doctorId, date, time],
  );

  /**
   * Aviso de horário: só existe quando há clínica escolhida e data/hora
   * válidas. A clínica é opcional de propósito — sem unidade, não há grade
   * contra a qual comparar, e inventar um aviso seria pior que não avisar.
   */
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

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError("Preencha paciente, médico, data e horário.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const scheduledAt = partsToIso(date, time);
      if (isEdit && appointment) {
        // Só manda `clinicId` quando ele de fato mudou: uma clínica
        // soft-deletada não aparece em `useClinics`, mas o efeito de
        // preenchimento carrega o uuid dela mesmo assim — reenviá-lo sem
        // mudança faria o backend (que filtra soft delete) recusar o PATCH
        // inteiro com 404, e mandar `null` apagaria o vínculo histórico.
        const mudouClinica =
          (clinicId || null) !== (appointment.clinicId ?? null);
        await appointmentService.update(appointment.id, {
          type,
          scheduledAt,
          durationMinutes: duration,
          notes,
          ...(mudouClinica ? { clinicId: clinicId || null } : {}),
        });
      } else {
        await appointmentService.create({
          patientId,
          doctorId,
          type,
          scheduledAt,
          durationMinutes: duration,
          notes,
          clinicId: clinicId || null,
        });
      }
      onSaved();
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
        {/* Paciente */}
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
            }}
            onSearch={searchPatients}
            placeholder="Buscar paciente pelo nome..."
            disabled={isEdit}
          />
        </div>

        {/* Médico (só quando há mais de um acessível) */}
        {doctors.length > 1 && (
          <div className="flex flex-col gap-1">
            <label className="ds-label mb-0">
              Médico<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select
              className="ds-input"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              disabled={isEdit}
            >
              <option value="">Selecione o médico</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.specialty ? ` — ${d.specialty}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clínica (local de atendimento) */}
        <div className="flex flex-col gap-1">
          <label htmlFor="clinica" className="ds-label mb-0">
            Clínica
          </label>
          <select
            id="clinica"
            className="ds-input"
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
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

        {/* Tipo */}
        <div className="flex flex-col gap-1">
          <label className="ds-label mb-0">Tipo</label>
          <select
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

        {/* Data + horário */}
        <div className="grid grid-cols-2 gap-3" data-tour="agenda-modal-horario">
          <div className="flex flex-col gap-1">
            <label className="ds-label mb-0">
              Data<span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="flex items-stretch gap-2">
              <div className="flex-1">
                <DateInput value={date} onChange={setDate} required />
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

        {/* Consultas já marcadas no dia */}
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

        {/* Duração */}
        <div className="flex flex-col gap-1">
          <label className="ds-label mb-0">Duração</label>
          <select
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

        {/* Observações */}
        <div className="flex flex-col gap-1">
          <label className="ds-label mb-0">Observações</label>
          <textarea
            className="ds-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Motivo da consulta, orientações, etc."
            rows={3}
          />
        </div>

        {avisoHorario && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">{avisoHorario}</p>
          </div>
        )}

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
          disabled={!canSubmit || emTour || dadosFabricados}
          loadingText="Salvando..."
        >
          {avisoHorario
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
          setNewPatientOpen(false);
        }}
      />
    </>
  );
}
