"use client";

import { useEffect, useState } from "react";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  AppointmentStatus,
  AppointmentType,
} from "@/services/appointment.service";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const showAppointmentFilters = draft.kind !== "surgery";

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col justify-end sm:flex-row sm:justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agenda-filter-title"
    >
      <button type="button" aria-label="Fechar filtros" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <section className="relative w-full max-h-[92dvh] sm:max-h-full sm:w-[420px] sm:max-w-full sm:h-full bg-white shadow-2xl flex flex-col rounded-t-2xl sm:rounded-none animate-slide-up sm:animate-slide-in-right mobile-sheet-offset">
        <header className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 id="agenda-filter-title" className="ds-modal-title">Filtros da agenda</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-full text-neutral-500 hover:bg-neutral-100">×</button>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6">
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
        <footer className="flex items-center justify-between gap-3 p-4 border-t border-neutral-100">
          <button type="button" onClick={() => { setDraft(DEFAULT_AGENDA_FILTERS); onClear(); }} className="px-3 py-2 text-sm font-semibold text-teal-700 hover:underline">Limpar filtros</button>
          <button type="button" onClick={() => { onApply(draft); onClose(); }} className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800">Aplicar filtros</button>
        </footer>
      </section>
    </div>
  );
}
