"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { DateInput } from "@/components/ui/DateInput";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { getApiErrorMessage } from "@/lib/http-error";
import { formatDoctorName } from "@/lib/formatters";
import { dateKey, hhmm } from "@/lib/calendar";
import {
  availabilityService,
  ScheduleBlock,
} from "@/services/availability.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (mensagem: string) => void;
  block?: ScheduleBlock | null;
  doctors: { id: string; name: string; isPhysician?: boolean }[];
  clinics?: { id: string; name: string }[];
  defaultDate?: string | null;
  podeClinicaToda?: boolean;
}

function iso(data: string, hora: string): string {
  const [y, m, d] = data.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0).toISOString();
}

export function ScheduleBlockModal({
  isOpen,
  onClose,
  onSaved,
  block,
  doctors,
  clinics = [],
  defaultDate,
  podeClinicaToda = false,
}: Props) {
  const [doctorId, setDoctorId] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [date, setDate] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [from, setFrom] = useState("08:00");
  const [to, setTo] = useState("12:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (block) {
      const ini = new Date(block.startsAt);
      const fim = new Date(block.endsAt);
      setDoctorId(block.doctorId ?? "");
      setClinicId(block.clinicId ?? "");
      setDate(dateKey(ini));
      setAllDay(block.allDay);
      setFrom(block.allDay ? "08:00" : hhmm(ini));
      setTo(block.allDay ? "12:00" : hhmm(fim));
      setReason(block.reason ?? "");
    } else {
      setDoctorId("");
      setClinicId("");
      setDate(defaultDate ?? dateKey(new Date()));
      setAllDay(false);
      setFrom("08:00");
      setTo("12:00");
      setReason("");
    }
  }, [isOpen, block, defaultDate]);

  const unicoProfissional = doctors.length === 1 ? doctors[0].id : null;
  useEffect(() => {
    if (!isOpen || block || !unicoProfissional) return;
    setDoctorId((atual) => atual || unicoProfissional);
  }, [isOpen, block, unicoProfissional]);

  const somenteLeitura = !!block && !block.doctorId && !podeClinicaToda;

  const salvar = async () => {
    if (somenteLeitura) return;
    if (!doctorId && !podeClinicaToda) {
      setError("Escolha o profissional.");
      return;
    }
    if (!date) {
      setError("Informe a data.");
      return;
    }
    if (!allDay && from >= to) {
      setError("O início deve ser antes do fim.");
      return;
    }
    setError(null);
    setSaving(true);
    const startsAt = iso(date, allDay ? "00:00" : from);
    const endsAt = allDay
      ? new Date(new Date(startsAt).getTime() + 24 * 60 * 60_000).toISOString()
      : iso(date, to);
    const payload = {
      doctorId: doctorId || null,
      clinicId: clinicId || null,
      startsAt,
      endsAt,
      allDay,
      reason: reason.trim() || null,
    };
    try {
      if (block) await availabilityService.updateBlock(block.id, payload);
      else await availabilityService.createBlock(payload);
      onSaved(block ? "Bloqueio atualizado." : "Horário bloqueado.");
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível salvar o bloqueio."));
    } finally {
      setSaving(false);
    }
  };

  const remover = async () => {
    if (!block || somenteLeitura) return;
    setDeleting(true);
    setError(null);
    try {
      await availabilityService.deleteBlock(block.id);
      onSaved("Bloqueio removido.");
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível remover o bloqueio."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={block ? "Bloqueio de agenda" : "Bloquear horário"}
      size="sm"
    >
      <fieldset
        disabled={somenteLeitura}
        className="px-5 py-4 flex flex-col gap-3 min-w-0"
      >
        {somenteLeitura && (
          <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            Bloqueio de toda a clínica: só administradores da conta podem
            alterar ou remover.
          </p>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="bloqueio-profissional" className="ds-label mb-0">
            Profissional
          </label>
          <select
            id="bloqueio-profissional"
            className="ds-input"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          >
            {podeClinicaToda || somenteLeitura ? (
              <option value="">Toda a clínica</option>
            ) : (
              <option value="" disabled>
                Selecione o profissional
              </option>
            )}
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {formatDoctorName(d.name, d.isPhysician)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="bloqueio-clinica" className="ds-label mb-0">
            Clínica
          </label>
          <select
            id="bloqueio-clinica"
            className="ds-input"
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
          >
            <option value="">Todas as clínicas</option>
            {clinicId && !clinics.some((c) => c.id === clinicId) && (
              <option value={clinicId}>Clínica atual</option>
            )}
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <DateInput id="bloqueio-data" label="Data" value={date} onChange={setDate} />

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-teal-600"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          Dia inteiro
        </label>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="bloqueio-de" className="ds-label mb-0">
                De
              </label>
              <input
                id="bloqueio-de"
                type="time"
                className="ds-input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="bloqueio-ate" className="ds-label mb-0">
                Até
              </label>
              <input
                id="bloqueio-ate"
                type="time"
                className="ds-input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="bloqueio-motivo" className="ds-label mb-0">
            Motivo
          </label>
          <input
            id="bloqueio-motivo"
            className="ds-input"
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: congresso, férias, reunião"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </fieldset>

      <ModalFooter align="end">
        {block && !somenteLeitura && (
          <SpinnerButton
            variant="danger"
            onClick={remover}
            isLoading={deleting}
            disabled={saving}
            className="sm:mr-auto"
          >
            Remover
          </SpinnerButton>
        )}
        <SpinnerButton variant="secondary" onClick={onClose}>
          {somenteLeitura ? "Fechar" : "Cancelar"}
        </SpinnerButton>
        {!somenteLeitura && (
          <SpinnerButton
            variant="primary"
            onClick={salvar}
            isLoading={saving}
            disabled={deleting}
            loadingText="Salvando..."
          >
            {block ? "Salvar" : "Bloquear"}
          </SpinnerButton>
        )}
      </ModalFooter>
    </Modal>
  );
}
