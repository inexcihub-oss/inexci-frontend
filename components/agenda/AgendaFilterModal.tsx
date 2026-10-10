"use client";

import { useEffect, useState } from "react";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  AppointmentStatus,
  AppointmentType,
} from "@/services/appointment.service";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";

export type AgendaEventKind = "all" | "appointment" | "surgery";

export interface AgendaFilterState {
  kind: AgendaEventKind;
  appointmentStatuses: AppointmentStatus[];
  appointmentTypes: AppointmentType[];
  doctorIds: string[];
  clinicIds: string[];
}

export const DEFAULT_AGENDA_FILTERS: AgendaFilterState = {
  kind: "all",
  appointmentStatuses: [],
  appointmentTypes: [],
  doctorIds: [],
  clinicIds: [],
};

export function countActiveAgendaFilters(filters: AgendaFilterState) {
  return Number(filters.kind !== "all") +
    Number(filters.appointmentStatuses.length > 0) +
    Number(filters.appointmentTypes.length > 0) +
    Number(filters.doctorIds.length > 0) +
    Number(filters.clinicIds.length > 0);
}

type Option = { id: string; name: string };

interface AgendaFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: AgendaFilterState) => void;
  onClear: () => void;
  currentFilters: AgendaFilterState;
  doctors: Option[];
  clinics: Option[];
  canFilterSurgeries: boolean;
}

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("min-h-9 px-3 rounded-full border text-xs font-medium transition-colors", selected ? "border-teal-700 bg-teal-700 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50")}>{label}</button>;
}

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function AgendaFilterModal({ isOpen, onClose, onApply, onClear, currentFilters, doctors, clinics, canFilterSurgeries }: AgendaFilterModalProps) {
  const [draft, setDraft] = useState(currentFilters);

  useEffect(() => {
    if (isOpen) setDraft(currentFilters);
  }, [isOpen, currentFilters]);

  const showAppointmentFilters = draft.kind !== "surgery";

  const footer = (
    <ModalFooter>
      <button type="button" onClick={() => { setDraft(DEFAULT_AGENDA_FILTERS); onClear(); }} className="px-3 py-2 text-sm font-semibold text-teal-700 hover:underline">Limpar filtros</button>
      <button type="button" onClick={() => { onApply(draft); onClose(); }} className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800">Aplicar filtros</button>
    </ModalFooter>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Filtros da agenda" variant="drawer" footer={footer}>
        <div className="px-5 py-5 space-y-6">
          <div>
            <p className="text-sm font-semibold text-neutral-900 mb-3">Exibir</p>
            <div className="flex flex-wrap gap-2">
              {(["all", "appointment", ...(canFilterSurgeries ? ["surgery"] : [])] as AgendaEventKind[]).map((kind) => <Pill key={kind} label={kind === "all" ? "Tudo" : kind === "appointment" ? "Consultas" : "Cirurgias"} selected={draft.kind === kind} onClick={() => setDraft((state) => ({ ...state, kind }))} />)}
            </div>
          </div>

          {showAppointmentFilters && <>
          <div className="border-t border-neutral-100 pt-5">
            <p className="text-sm font-semibold text-neutral-900 mb-3">Status da consulta</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(APPOINTMENT_STATUS_LABELS) as [AppointmentStatus, string][]).map(([status, label]) => <Pill key={status} label={label} selected={draft.appointmentStatuses.includes(status)} onClick={() => setDraft((state) => ({ ...state, appointmentStatuses: toggle(state.appointmentStatuses, status) as AppointmentStatus[] }))} />)}
            </div>
          </div>
          <div className="border-t border-neutral-100 pt-5">
            <p className="text-sm font-semibold text-neutral-900 mb-3">Tipo de consulta</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(APPOINTMENT_TYPE_LABELS) as [AppointmentType, string][]).map(([type, label]) => <Pill key={type} label={label} selected={draft.appointmentTypes.includes(type)} onClick={() => setDraft((state) => ({ ...state, appointmentTypes: toggle(state.appointmentTypes, type) as AppointmentType[] }))} />)}
            </div>
          </div>
          </>}
          {doctors.length > 0 && <div className="border-t border-neutral-100 pt-5"><p className="text-sm font-semibold text-neutral-900 mb-3">Médicos</p><div className="flex flex-wrap gap-2">{doctors.map((doctor) => <Pill key={doctor.id} label={doctor.name} selected={draft.doctorIds.includes(doctor.id)} onClick={() => setDraft((state) => ({ ...state, doctorIds: toggle(state.doctorIds, doctor.id) }))} />)}</div></div>}
          {showAppointmentFilters && clinics.length > 0 && <div className="border-t border-neutral-100 pt-5"><p className="text-sm font-semibold text-neutral-900 mb-1">Clínicas</p><p className="text-xs text-neutral-500 mb-3">Filtra consultas pelo local de atendimento.</p><div className="flex flex-wrap gap-2">{clinics.map((clinic) => <Pill key={clinic.id} label={clinic.name} selected={draft.clinicIds.includes(clinic.id)} onClick={() => setDraft((state) => ({ ...state, clinicIds: toggle(state.clinicIds, clinic.id) }))} />)}</div></div>}
        </div>
    </Modal>
  );
}
