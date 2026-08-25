"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { DateInput } from "@/components/ui/DateInput";
import Button from "@/components/ui/Button";
import { appointmentService } from "@/services/appointment.service";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { AGENDA_EXPORT_FIELDS, AgendaExportField, AgendaExportSource, exportAgendaToCsv, exportAgendaToPdf, getAgendaExportRows } from "@/lib/export-agenda";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { AvailableDoctor } from "@/types";
import { AgendaDoctorFilter } from "@/components/agenda/AgendaDoctorFilter";

interface AgendaExportModalProps { isOpen: boolean; onClose: () => void; defaultFrom: string; defaultTo: string; availableDoctors?: AvailableDoctor[]; defaultDoctorIds?: string[]; canExportSurgeries: boolean; }
const ALL_SOURCES: AgendaExportSource[] = ["appointments", "surgeries"];
const ALL_FIELDS = AGENDA_EXPORT_FIELDS.map((field) => field.key);
const isValidIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const toApiRange = (from: string, to: string) => ({ from: new Date(from + "T00:00:00").toISOString(), to: new Date(to + "T23:59:59.999").toISOString() });

export function AgendaExportModal({ isOpen, onClose, defaultFrom, defaultTo, availableDoctors = [], defaultDoctorIds = [], canExportSurgeries }: AgendaExportModalProps) {
  const { showToast } = useToast();
  const [from, setFrom] = useState(defaultFrom); const [to, setTo] = useState(defaultTo);
  const [sources, setSources] = useState<AgendaExportSource[]>(canExportSurgeries ? ALL_SOURCES : ["appointments"]);
  const [fields, setFields] = useState<AgendaExportField[]>(ALL_FIELDS);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>(defaultDoctorIds);
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "csv" | null>(null);
  useEffect(() => { if (!isOpen) return; setFrom(defaultFrom); setTo(defaultTo); setSelectedDoctorIds(defaultDoctorIds); setSources(canExportSurgeries ? ALL_SOURCES : ["appointments"]); setFields(ALL_FIELDS); setExportingFormat(null); }, [isOpen, defaultFrom, defaultTo, defaultDoctorIds, canExportSurgeries]);
  const rangeIsValid = isValidIsoDate(from) && isValidIsoDate(to) && from <= to;
  const range = useMemo(() => rangeIsValid ? toApiRange(from, to) : null, [from, to, rangeIsValid]);
  const appointments = useQuery({ queryKey: ["appointments", "agenda-export", from, to], queryFn: () => appointmentService.getAgenda({ from: range!.from, to: range!.to }), enabled: isOpen && rangeIsValid && sources.includes("appointments") });
  const surgeries = useQuery({ queryKey: ["surgery-requests", "agenda-export", from, to], queryFn: () => surgeryRequestService.getAgenda(range!.from, range!.to), enabled: isOpen && rangeIsValid && canExportSurgeries && sources.includes("surgeries") });
  const doctorNameById = useMemo(() => Object.fromEntries(availableDoctors.map((doctor) => [doctor.id, doctor.name])), [availableDoctors]);
  const doctorFilterLabel = useMemo(() => selectedDoctorIds.length ? availableDoctors.filter((doctor) => selectedDoctorIds.includes(doctor.id)).map((doctor) => doctor.name).join(", ") : "Todos", [availableDoctors, selectedDoctorIds]);
  const options = useMemo(() => ({ from, to, sources, fields, doctorIds: selectedDoctorIds, doctorFilterLabel, doctorNameById }), [from, to, sources, fields, selectedDoctorIds, doctorFilterLabel, doctorNameById]);
  const previewRows = useMemo(() => getAgendaExportRows(appointments.data ?? [], surgeries.data?.records ?? [], options), [appointments.data, surgeries.data, options]);
  const isFetching = appointments.isFetching || surgeries.isFetching;
  const isError = appointments.isError || surgeries.isError;
  const toggleSource = (source: AgendaExportSource) => setSources((current) => current.includes(source) ? current.filter((value) => value !== source) : [...current, source]);
  const toggleField = (field: AgendaExportField) => setFields((current) => current.includes(field) ? current.filter((value) => value !== field) : [...current, field]);
  const handleExport = async (format: "pdf" | "csv") => {
    if (!rangeIsValid || !sources.length || !fields.length) return;
    setExportingFormat(format);
    try {
      const [appointmentData, surgeryData] = await Promise.all([
        sources.includes("appointments") ? appointmentService.getAgenda({ from: range!.from, to: range!.to }) : Promise.resolve([]),
        sources.includes("surgeries") && canExportSurgeries ? surgeryRequestService.getAgenda(range!.from, range!.to).then((result) => result.records) : Promise.resolve([]),
      ]);
      if (!getAgendaExportRows(appointmentData, surgeryData, options).length) { showToast("Nenhum registro encontrado no período selecionado.", "error"); return; }
      if (format === "pdf") await exportAgendaToPdf(appointmentData, surgeryData, options); else exportAgendaToCsv(appointmentData, surgeryData, options);
      onClose();
    } catch { showToast("Não foi possível exportar a agenda. Tente novamente.", "error"); } finally { setExportingFormat(null); }
  };
  return <Modal isOpen={isOpen} onClose={onClose} title="Exportar agenda" size="md"><div className="p-5 md:p-6 space-y-5"><p className="text-sm text-gray-600">Escolha quais registros e campos deseja incluir. Por padrão, todos os dados disponíveis são exportados.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><DateInput id="agenda-export-from" label="Data inicial" value={from} onChange={setFrom} required /><DateInput id="agenda-export-to" label="Data final" value={to} onChange={setTo} required /></div>{isValidIsoDate(from) && isValidIsoDate(to) && from > to && <p className="text-xs text-red-500">A data inicial deve ser anterior ou igual à data final.</p>}<div><p className="ds-label mb-2">Registros a exportar</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => toggleSource("appointments")} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold", sources.includes("appointments") ? "bg-teal-600 text-white" : "border border-neutral-300 text-neutral-600")}>Atendimentos</button>{canExportSurgeries && <button type="button" onClick={() => toggleSource("surgeries")} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold", sources.includes("surgeries") ? "bg-teal-600 text-white" : "border border-neutral-300 text-neutral-600")}>Cirurgias</button>}</div>{!sources.length && <p className="text-xs text-red-500 mt-2">Selecione ao menos um tipo de registro.</p>}</div>{availableDoctors.length > 1 && <AgendaDoctorFilter doctors={availableDoctors} selectedDoctorIds={selectedDoctorIds} onChange={setSelectedDoctorIds} />}<div><div className="flex items-center justify-between mb-2"><p className="ds-label">Dados a exportar</p><button type="button" className="text-xs text-teal-700 font-semibold" onClick={() => setFields(fields.length === ALL_FIELDS.length ? [] : ALL_FIELDS)}>{fields.length === ALL_FIELDS.length ? "Limpar seleção" : "Selecionar todos"}</button></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{AGENDA_EXPORT_FIELDS.map((field) => <label key={field.key} className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer"><input type="checkbox" checked={fields.includes(field.key)} onChange={() => toggleField(field.key)} className="accent-teal-600" />{field.label}</label>)}</div>{!fields.length && <p className="text-xs text-red-500 mt-2">Selecione ao menos um dado.</p>}</div><div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">Prévia</p>{isFetching ? <p className="text-sm text-neutral-500">Carregando registros...</p> : isError ? <p className="text-sm text-red-500">Não foi possível carregar a prévia do período.</p> : <p className="text-sm text-neutral-700"><span className="font-semibold text-neutral-900">{previewRows.length}</span> {previewRows.length === 1 ? "registro" : "registros"} selecionados</p>}</div><div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose} disabled={!!exportingFormat}>Cancelar</Button><Button type="button" variant="outline" onClick={() => handleExport("csv")} disabled={!rangeIsValid || !sources.length || !fields.length || isFetching || !!exportingFormat}>{exportingFormat === "csv" ? <span className="flex gap-2"><Loader2 className="w-4 h-4 animate-spin" />Exportando...</span> : "Exportar CSV"}</Button><Button type="button" variant="primary" onClick={() => handleExport("pdf")} disabled={!rangeIsValid || !sources.length || !fields.length || isFetching || !!exportingFormat}>{exportingFormat === "pdf" ? <span className="flex gap-2"><Loader2 className="w-4 h-4 animate-spin" />Exportando...</span> : "Exportar PDF"}</Button></div></div></Modal>;
}
