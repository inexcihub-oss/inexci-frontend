/** Utilitários para exportação unificada da agenda (consultas e cirurgias). */
import { Appointment, APPOINTMENT_STATUS_LABELS, APPOINTMENT_TYPE_LABELS } from "@/services/appointment.service";
import { SurgeryRequestListItem } from "@/services/surgery-request.service";

export type AgendaExportStatusFilter = 5 | 6 | null;
export type AgendaExportSource = "appointments" | "surgeries";
export type AgendaExportField = "tipoRegistro" | "data" | "hora" | "paciente" | "medico" | "tipo" | "duracao" | "local" | "status" | "observacoes" | "procedimento" | "hospital" | "convenio" | "fornecedor" | "protocolo";
export interface AgendaExportItem extends SurgeryRequestListItem { surgeryDate: string; }
export interface AgendaExportOptions { from: string; to: string; statusFilter?: AgendaExportStatusFilter; doctorIds?: string[]; doctorFilterLabel?: string; sources?: AgendaExportSource[]; fields?: AgendaExportField[]; doctorNameById?: Record<string, string>; }
export const AGENDA_EXPORT_FIELDS: { key: AgendaExportField; label: string }[] = [
  { key: "tipoRegistro", label: "Tipo de registro" }, { key: "data", label: "Data" }, { key: "hora", label: "Horário" }, { key: "paciente", label: "Paciente" }, { key: "medico", label: "Médico" }, { key: "tipo", label: "Tipo de atendimento" }, { key: "duracao", label: "Duração" }, { key: "local", label: "Local" }, { key: "status", label: "Status" }, { key: "observacoes", label: "Observações" }, { key: "procedimento", label: "Procedimento" }, { key: "hospital", label: "Hospital" }, { key: "convenio", label: "Convênio" }, { key: "fornecedor", label: "Fornecedor" }, { key: "protocolo", label: "Protocolo" },
];
interface AgendaExportRow extends Record<AgendaExportField, string> { dateValue: string; }

export function displayAgendaStatus(status: number): number { return status >= 6 ? 6 : status; }
export function getAgendaStatusLabel(status: number): string { return displayAgendaStatus(status) === 5 ? "Agendada" : "Realizada"; }
export function toLocalDateKey(dateStr: string): string { const d = new Date(dateStr); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
export function formatAgendaTime(dateStr: string): string { const d = new Date(dateStr); const value = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; return value === "00:00" ? "—" : value; }
export function formatAgendaDateBR(dateStr: string): string { const d = new Date(dateStr); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; }
export function formatPeriodLabel(from: string, to: string): string { const first = formatAgendaDateBR(from + "T00:00:00"); const last = formatAgendaDateBR(to + "T00:00:00"); return from === to ? first : `${first} a ${last}`; }
export function filterAgendaByDoctors<T extends { doctor?: { id: string } | null }>(items: T[], doctorIds: string[] | undefined): T[] { return !doctorIds?.length ? items : items.filter((item) => !!item.doctor?.id && doctorIds.includes(item.doctor.id)); }
export function normalizeAgendaItems(records: SurgeryRequestListItem[]): AgendaExportItem[] { return records.filter((record): record is AgendaExportItem => typeof record.surgeryDate === "string" && record.surgeryDate.length > 0).sort((a, b) => new Date(a.surgeryDate).getTime() - new Date(b.surgeryDate).getTime()); }
export function filterAgendaItems(items: AgendaExportItem[], options: AgendaExportOptions): AgendaExportItem[] { let result = items.filter((item) => { const date = toLocalDateKey(item.surgeryDate); return date >= options.from && date <= options.to; }); if (options.statusFilter != null) result = result.filter((item) => displayAgendaStatus(item.status) === options.statusFilter); return filterAgendaByDoctors(result, options.doctorIds); }
export function groupAgendaByDate(items: AgendaExportItem[]): [string, AgendaExportItem[]][] { const groups = new Map<string, AgendaExportItem[]>(); items.forEach((item) => { const key = toLocalDateKey(item.surgeryDate); groups.set(key, [...(groups.get(key) ?? []), item]); }); return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)); }

function mapSurgery(item: AgendaExportItem): AgendaExportRow { return { dateValue: item.surgeryDate, tipoRegistro: "Cirurgia", data: formatAgendaDateBR(item.surgeryDate), hora: formatAgendaTime(item.surgeryDate), paciente: item.patient?.name ?? "—", medico: item.doctor?.name ? `Dr. ${item.doctor.name}` : "—", tipo: "—", duracao: "—", local: item.hospital?.name ?? "—", status: getAgendaStatusLabel(item.status), observacoes: "—", procedimento: item.procedure?.name ?? item.tussProcedure?.description ?? item.procedureName ?? "—", hospital: item.hospital?.name ?? "—", convenio: item.healthPlan?.name ?? "—", fornecedor: item.suppliers ? String(item.suppliers) : "—", protocolo: item.protocol ? `#${item.protocol}` : "—" }; }
function mapAppointment(item: Appointment, names: Record<string, string>): AgendaExportRow { return { dateValue: item.scheduledAt, tipoRegistro: "Atendimento", data: formatAgendaDateBR(item.scheduledAt), hora: formatAgendaTime(item.scheduledAt), paciente: item.patient?.name ?? "—", medico: names[item.doctorId] ? `Dr. ${names[item.doctorId]}` : "—", tipo: APPOINTMENT_TYPE_LABELS[item.type], duracao: `${item.durationMinutes} min`, local: item.clinic?.name ?? "—", status: APPOINTMENT_STATUS_LABELS[item.status], observacoes: item.notes ?? "—", procedimento: "—", hospital: "—", convenio: "—", fornecedor: "—", protocolo: "—" }; }
export function getAgendaExportRows(appointments: Appointment[], surgeries: SurgeryRequestListItem[], options: AgendaExportOptions): AgendaExportRow[] { const sources = options.sources ?? ["appointments", "surgeries"]; const rows: AgendaExportRow[] = []; if (sources.includes("appointments")) rows.push(...appointments.filter((item) => { const date = toLocalDateKey(item.scheduledAt); return date >= options.from && date <= options.to && (!options.doctorIds?.length || options.doctorIds.includes(item.doctorId)); }).map((item) => mapAppointment(item, options.doctorNameById ?? {}))); if (sources.includes("surgeries")) rows.push(...filterAgendaItems(normalizeAgendaItems(surgeries), options).map(mapSurgery)); return rows.sort((a, b) => new Date(a.dateValue).getTime() - new Date(b.dateValue).getTime()); }
function selectedFields(options: AgendaExportOptions) { const keys = options.fields?.length ? options.fields : AGENDA_EXPORT_FIELDS.map((field) => field.key); return AGENDA_EXPORT_FIELDS.filter((field) => keys.includes(field.key)); }
export function sanitizeCsv(value: string) {
  const protectedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(protectedValue)
    ? `"${protectedValue.replace(/"/g, '""')}"`
    : protectedValue;
}
function download(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
export function exportAgendaToCsv(appointments: Appointment[], surgeries: SurgeryRequestListItem[], options: AgendaExportOptions): void { const fields = selectedFields(options); const rows = getAgendaExportRows(appointments, surgeries, options); const csv = [fields.map((field) => field.label).join(","), ...rows.map((row) => fields.map((field) => sanitizeCsv(row[field.key])).join(","))].join("\n"); download(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), `agenda-${options.from}_${options.to}.csv`); }
function pdfText(value: string): string {
  return value.replace(/[—–]/g, "-").replace(/[^\x20-\xFF]/g, "");
}

function truncatePdfText(value: string, maxWidth: number, font: { widthOfTextAtSize: (text: string, size: number) => number }, size: number): string {
  const text = pdfText(value);
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let result = text;
  while (result.length && font.widthOfTextAtSize(result + "...", size) > maxWidth) result = result.slice(0, -1);
  return result ? result + "..." : "";
}

/** Gera um PDF real e inicia o download no navegador. */
export async function exportAgendaToPdf(appointments: Appointment[], surgeries: SurgeryRequestListItem[], options: AgendaExportOptions): Promise<void> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const fields = selectedFields(options);
  const rows = getAgendaExportRows(appointments, surgeries, options);
  const only = options.sources?.length === 1 ? options.sources[0] : null;
  const title = only === "appointments" ? "Agenda de Atendimentos" : only === "surgeries" ? "Agenda Cirúrgica" : "Agenda";
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = 841.89;
  const height = 595.28;
  const margin = 28;
  const headerHeight = 62;
  const rowHeight = 18;
  const tableWidth = width - margin * 2;
  const columnWidth = tableWidth / fields.length;
  const textSize = fields.length > 10 ? 5.5 : fields.length > 7 ? 6.5 : 7.5;
  const maxRowsPerPage = Math.max(1, Math.floor((height - margin * 2 - headerHeight - rowHeight * 2) / rowHeight));
  const chunks = rows.length ? Array.from({ length: Math.ceil(rows.length / maxRowsPerPage) }, (_, index) => rows.slice(index * maxRowsPerPage, (index + 1) * maxRowsPerPage)) : [[]];

  chunks.forEach((pageRows, pageIndex) => {
    const page = pdf.addPage([width, height]);
    page.drawRectangle({ x: margin, y: height - margin - headerHeight, width: tableWidth, height: headerHeight, color: rgb(0.059, 0.463, 0.431) });
    page.drawText(pdfText(title), { x: margin + 14, y: height - margin - 25, size: 16, font: bold, color: rgb(1, 1, 1) });
    page.drawText(pdfText(`Período: ${formatPeriodLabel(options.from, options.to)} | Médicos: ${options.doctorFilterLabel ?? "Todos"}`), { x: margin + 14, y: height - margin - 41, size: 8, font: regular, color: rgb(1, 1, 1) });
    page.drawText(`${rows.length} ${rows.length === 1 ? "registro" : "registros"}`, { x: margin, y: height - margin - headerHeight - 15, size: 8, font: bold, color: rgb(0.12, 0.16, 0.2) });
    const headerY = height - margin - headerHeight - 31;
    fields.forEach((field, index) => {
      const x = margin + index * columnWidth;
      page.drawRectangle({ x, y: headerY - rowHeight + 3, width: columnWidth, height: rowHeight, color: rgb(0.95, 0.96, 0.97), borderColor: rgb(0.82, 0.84, 0.86), borderWidth: 0.3 });
      page.drawText(truncatePdfText(field.label.toUpperCase(), columnWidth - 6, bold, textSize), { x: x + 3, y: headerY - 9, size: textSize, font: bold, color: rgb(0.24, 0.27, 0.3) });
    });
    if (!pageRows.length) page.drawText("Nenhum registro encontrado para os filtros selecionados.", { x: margin + 4, y: headerY - rowHeight - 15, size: 9, font: regular, color: rgb(0.4, 0.43, 0.47) });
    pageRows.forEach((row, rowIndex) => {
      const y = headerY - rowHeight * (rowIndex + 1);
      fields.forEach((field, columnIndex) => {
        const x = margin + columnIndex * columnWidth;
        page.drawRectangle({ x, y: y - rowHeight + 3, width: columnWidth, height: rowHeight, color: rowIndex % 2 ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1), borderColor: rgb(0.87, 0.88, 0.89), borderWidth: 0.25 });
        page.drawText(truncatePdfText(row[field.key], columnWidth - 6, regular, textSize), { x: x + 3, y: y - 9, size: textSize, font: regular, color: rgb(0.12, 0.16, 0.2) });
      });
    });
    page.drawText(`Inexci | Página ${pageIndex + 1} de ${chunks.length}`, { x: margin, y: margin - 4, size: 7, font: regular, color: rgb(0.45, 0.48, 0.52) });
  });
  const bytes = await pdf.save();
  // A cópia garante um ArrayBuffer próprio, compatível com Blob nos tipos DOM.
  const pdfBytes = new Uint8Array(bytes);
  download(new Blob([pdfBytes.buffer], { type: "application/pdf" }), `agenda-${options.from}_${options.to}.pdf`);
}
