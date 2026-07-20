/**
 * Utilitário de exportação da agenda cirúrgica (CSV e PDF).
 * Gera arquivos client-side a partir dos dados retornados por getAgenda.
 */

import { SurgeryRequestListItem } from "@/services/surgery-request.service";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type AgendaExportStatusFilter = 5 | 6 | null;

export interface AgendaExportItem extends SurgeryRequestListItem {
  surgeryDate: string;
}

export interface AgendaExportOptions {
  from: string;
  to: string;
  statusFilter?: AgendaExportStatusFilter;
  doctorIds?: string[];
  doctorFilterLabel?: string;
}

export function filterAgendaByDoctors<T extends { doctor?: { id: string } | null }>(
  items: T[],
  doctorIds: string[] | undefined,
): T[] {
  if (!doctorIds || doctorIds.length === 0) return items;
  return items.filter(
    (item) => item.doctor?.id && doctorIds.includes(item.doctor.id),
  );
}

interface AgendaExportRow {
  data: string;
  hora: string;
  paciente: string;
  procedimento: string;
  medico: string;
  hospital: string;
  convenio: string;
  fornecedor: string;
  status: string;
  protocolo: string;
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const HEADERS: { key: keyof AgendaExportRow; label: string }[] = [
  { key: "data", label: "Data" },
  { key: "hora", label: "Horário" },
  { key: "paciente", label: "Paciente" },
  { key: "procedimento", label: "Procedimento" },
  { key: "medico", label: "Médico" },
  { key: "hospital", label: "Hospital" },
  { key: "convenio", label: "Convênio" },
  { key: "fornecedor", label: "Fornecedor" },
  { key: "status", label: "Status" },
  { key: "protocolo", label: "Protocolo" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function displayAgendaStatus(status: number): number {
  return status >= 6 ? 6 : status;
}

export function getAgendaStatusLabel(status: number): string {
  return displayAgendaStatus(status) === 5 ? "Agendada" : "Realizada";
}

/** Retorna "YYYY-MM-DD" em horário local */
export function toLocalDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatAgendaTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  if (hours === "00" && minutes === "00") return "—";
  return `${hours}:${minutes}`;
}

export function formatAgendaDateBR(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatPeriodLabel(from: string, to: string): string {
  const fromLabel = formatAgendaDateBR(from + "T00:00:00");
  const toLabel = formatAgendaDateBR(to + "T00:00:00");
  return from === to ? fromLabel : `${fromLabel} a ${toLabel}`;
}

function formatDateHeading(dateKey: string): string {
  const date = new Date(dateKey + "T00:00:00");
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

function getProcedureName(item: AgendaExportItem): string {
  return (
    item.procedure?.name ??
    item.tussProcedure?.description ??
    item.procedureName ??
    "—"
  );
}

function sanitizeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Mapeamento e filtros ──────────────────────────────────────────────────────

function mapToRows(items: AgendaExportItem[]): AgendaExportRow[] {
  return items.map((item) => ({
    data: formatAgendaDateBR(item.surgeryDate),
    hora: formatAgendaTime(item.surgeryDate),
    paciente: item.patient?.name ?? "—",
    procedimento: getProcedureName(item),
    medico: item.doctor?.name ? `Dr. ${item.doctor.name}` : "—",
    hospital: item.hospital?.name ?? "—",
    convenio: item.healthPlan?.name ?? "—",
    fornecedor: item.suppliers ? String(item.suppliers) : "—",
    status: getAgendaStatusLabel(item.status),
    protocolo: item.protocol ? `#${item.protocol}` : "—",
  }));
}

export function normalizeAgendaItems(
  records: SurgeryRequestListItem[],
): AgendaExportItem[] {
  return records
    .filter(
      (record): record is AgendaExportItem =>
        typeof record.surgeryDate === "string" && record.surgeryDate.length > 0,
    )
    .sort(
      (a, b) =>
        new Date(a.surgeryDate).getTime() - new Date(b.surgeryDate).getTime(),
    );
}

export function filterAgendaItems(
  items: AgendaExportItem[],
  options: AgendaExportOptions,
): AgendaExportItem[] {
  let result = items.filter((item) => {
    const key = toLocalDateKey(item.surgeryDate);
    return key >= options.from && key <= options.to;
  });

  if (options.statusFilter !== null && options.statusFilter !== undefined) {
    result = result.filter(
      (item) => displayAgendaStatus(item.status) === options.statusFilter,
    );
  }

  result = filterAgendaByDoctors(result, options.doctorIds);

  return result;
}

export function groupAgendaByDate(
  items: AgendaExportItem[],
): [string, AgendaExportItem[]][] {
  const map = new Map<string, AgendaExportItem[]>();
  items.forEach((item) => {
    const key = toLocalDateKey(item.surgeryDate);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

// ── CSV ───────────────────────────────────────────────────────────────────────

export function exportAgendaToCsv(
  items: AgendaExportItem[],
  options: AgendaExportOptions,
): void {
  const filtered = filterAgendaItems(items, options);
  const rows = mapToRows(filtered);
  const header = HEADERS.map((h) => h.label).join(",");
  const lines = rows.map((row) =>
    HEADERS.map((h) => sanitizeCsvField(row[h.key])).join(","),
  );
  const csv = [header, ...lines].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, `agenda-cirurgica-${options.from}_${options.to}.csv`);
}

// ── PDF (HTML → print) ────────────────────────────────────────────────────────

export function exportAgendaToPdf(
  items: AgendaExportItem[],
  options: AgendaExportOptions,
): void {
  const filtered = filterAgendaItems(items, options);
  const rows = mapToRows(filtered);
  const grouped = groupAgendaByDate(filtered);
  const now = new Date().toLocaleString("pt-BR");
  const periodLabel = formatPeriodLabel(options.from, options.to);

  const statusFilterLabel =
    options.statusFilter === 5
      ? "Agendadas"
      : options.statusFilter === 6
        ? "Realizadas"
        : "Todas";

  const doctorFilterLabel = options.doctorFilterLabel ?? "Todos";

  const countAgendada = rows.filter((r) => r.status === "Agendada").length;
  const countRealizada = rows.filter((r) => r.status === "Realizada").length;

  const statusBadge = (status: string) => {
    const isAgendada = status === "Agendada";
    const bg = isAgendada ? "#CCFBF1" : "#D1FAE5";
    const text = isAgendada ? "#115E59" : "#065F46";
    const dot = isAgendada ? "#14B8A6" : "#059669";
    return `<span class="badge" style="background:${bg};color:${text}"><span class="dot" style="background:${dot}"></span>${escapeHtml(status)}</span>`;
  };

  const groupedSections = grouped
    .map(([dateKey, dayItems]) => {
      const dayRows = mapToRows(dayItems);
      const tableRows = dayRows
        .map(
          (row, index) => `
        <tr class="${index % 2 === 0 ? "even" : "odd"}">
          <td class="cell time">${escapeHtml(row.hora)}</td>
          <td class="cell">${escapeHtml(row.paciente)}</td>
          <td class="cell proc">${escapeHtml(row.procedimento)}</td>
          <td class="cell">${escapeHtml(row.medico)}</td>
          <td class="cell">${escapeHtml(row.hospital)}</td>
          <td class="cell">${escapeHtml(row.convenio)}</td>
          <td class="cell">${escapeHtml(row.fornecedor)}</td>
          <td class="cell center">${statusBadge(row.status)}</td>
          <td class="cell proto">${escapeHtml(row.protocolo)}</td>
        </tr>`,
        )
        .join("");

      return `
      <section class="day-group">
        <div class="day-header">
          <div class="day-badge">
            <span class="day-num">${new Date(dateKey + "T00:00:00").getDate()}</span>
            <span class="day-mon">${MONTHS[new Date(dateKey + "T00:00:00").getMonth()].slice(0, 3)}</span>
          </div>
          <div>
            <h3>${escapeHtml(formatDateHeading(dateKey))}</h3>
            <p>${dayItems.length} ${dayItems.length === 1 ? "cirurgia" : "cirurgias"}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Horário</th>
              <th>Paciente</th>
              <th>Procedimento</th>
              <th>Médico</th>
              <th>Hospital</th>
              <th>Convênio</th>
              <th>Fornecedor</th>
              <th>Status</th>
              <th>Protocolo</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </section>`;
    })
    .join("");

  const emptyState =
    rows.length === 0
      ? `<div class="empty">Nenhuma cirurgia encontrada para o período e filtros selecionados.</div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Agenda Cirúrgica — Inexci</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937; background:#fff; font-size:10px; }

    .header {
      display:flex; align-items:center; gap:12px;
      padding:16px 20px; margin-bottom:16px;
      background: linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%);
      border-radius:12px; color:#fff;
    }
    .header-icon {
      width:40px; height:40px; border-radius:10px;
      background:rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center;
      font-size:20px; flex-shrink:0;
    }
    .header-text h1 { font-size:16px; font-weight:700; letter-spacing:-.3px; }
    .header-text p { font-size:10px; opacity:.85; margin-top:2px; }
    .header-meta { margin-left:auto; text-align:right; font-size:9px; opacity:.85; line-height:1.5; }

    .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:14px; }
    .card {
      padding:10px 12px; border-radius:10px;
      border:1px solid #e5e7eb; position:relative; overflow:hidden;
    }
    .card::before {
      content:""; position:absolute; top:0; left:0; width:3px; height:100%;
      border-radius:3px 0 0 3px;
    }
    .card-1 { background:#f0fdfa; } .card-1::before { background:#0f766e; }
    .card-2 { background:#ccfbf1; } .card-2::before { background:#14b8a6; }
    .card-3 { background:#d1fae5; } .card-3::before { background:#059669; }
    .card-4 { background:#f9fafb; } .card-4::before { background:#6b7280; }
    .card .num { font-size:20px; font-weight:800; color:#111827; line-height:1; }
    .card .lbl { font-size:8px; color:#6b7280; margin-top:3px; text-transform:uppercase; letter-spacing:.5px; font-weight:600; }

    .day-group { margin-bottom:16px; break-inside:avoid; }
    .day-header { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
    .day-badge {
      width:42px; height:42px; border-radius:10px; background:#f0fdfa; border:1px solid #99f6e4;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
    }
    .day-num { font-size:16px; font-weight:800; color:#0f766e; line-height:1; }
    .day-mon { font-size:8px; color:#14b8a6; text-transform:uppercase; }
    .day-header h3 { font-size:11px; font-weight:700; color:#111827; }
    .day-header p { font-size:9px; color:#6b7280; margin-top:2px; }

    table { width:100%; border-collapse:separate; border-spacing:0; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
    thead th {
      padding:7px 6px; text-align:left; font-size:7px; font-weight:700;
      text-transform:uppercase; letter-spacing:.6px; color:#6b7280;
      background:#f9fafb; border-bottom:2px solid #e5e7eb;
    }
    .cell { padding:6px; border-bottom:1px solid #f3f4f6; font-size:8.5px; line-height:1.3; vertical-align:middle; }
    .even { background:#fff; }
    .odd { background:#fafbfc; }
    .time { font-weight:700; color:#0f766e; white-space:nowrap; }
    .proto { font-weight:600; color:#6b7280; white-space:nowrap; }
    .proc { max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .center { text-align:center; }

    .badge {
      display:inline-flex; align-items:center; gap:3px;
      padding:2px 7px; border-radius:99px;
      font-size:7.5px; font-weight:600; white-space:nowrap;
    }
    .dot { width:5px; height:5px; border-radius:50%; display:inline-block; flex-shrink:0; }

    .empty {
      padding:24px; border:1px dashed #d1d5db; border-radius:12px;
      text-align:center; color:#6b7280; font-size:11px;
    }

    .footer {
      margin-top:16px; padding-top:10px; border-top:1px solid #e5e7eb;
      display:flex; justify-content:space-between; align-items:center;
      font-size:8px; color:#9ca3af;
    }
    .footer-brand { font-weight:700; color:#0f766e; font-size:9px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-icon">📅</div>
    <div class="header-text">
      <h1>Agenda Cirúrgica</h1>
      <p>Relatório de cirurgias agendadas e realizadas</p>
    </div>
    <div class="header-meta">
      Período: ${escapeHtml(periodLabel)}<br/>
      Status: ${escapeHtml(statusFilterLabel)}<br/>
      Médicos: ${escapeHtml(doctorFilterLabel)}<br/>
      Gerado em ${now}
    </div>
  </div>

  <div class="summary">
    <div class="card card-1"><div class="num">${rows.length}</div><div class="lbl">Total</div></div>
    <div class="card card-2"><div class="num">${countAgendada}</div><div class="lbl">Agendadas</div></div>
    <div class="card card-3"><div class="num">${countRealizada}</div><div class="lbl">Realizadas</div></div>
    <div class="card card-4"><div class="num">${grouped.length}</div><div class="lbl">Dias com cirurgias</div></div>
  </div>

  ${emptyState}
  ${groupedSections}

  <div class="footer">
    <span class="footer-brand">Inexci</span>
    <span>Relatório gerado automaticamente em ${now}</span>
  </div>

  <script>window.onload=function(){window.print()}</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
