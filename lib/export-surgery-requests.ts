/**
 * Utilitário de exportação de solicitações cirúrgicas (CSV e PDF)
 * Gera arquivos client-side a partir dos dados já carregados no kanban.
 */

import { SurgeryRequest, PRIORITY_LABELS } from "@/types/surgery-request.types";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** createdAt já vem formatado como "dd/mm/yyyy" do mapeamento da página */
function formatDate(value: string): string {
  if (!value) return "—";
  // Já está em dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  // Tenta ISO
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
  } catch {
    /* ignore */
  }
  return value || "—";
}

function sanitizeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ── Colunas essenciais ─────────────────────────────────────────────────────────

interface ExportRow {
  protocolo: string;
  paciente: string;
  procedimento: string;
  medico: string;
  convenio: string;
  prioridade: string;
  status: string;
  pendencias: string;
  criadoEm: string;
}

function mapToRows(requests: SurgeryRequest[]): ExportRow[] {
  return requests.map((r) => ({
    protocolo: r.protocol ? `SC-${r.protocol}` : r.id,
    paciente: r.patient?.name ?? "—",
    procedimento: r.procedureName ?? "—",
    medico: r.doctor?.name ?? "—",
    convenio: r.healthPlan ?? "—",
    prioridade: PRIORITY_LABELS[r.priority] ?? String(r.priority),
    status: r.status,
    pendencias: `${r.pendenciesCompleted ?? 0}/${r.pendenciesCount}`,
    criadoEm: formatDate(r.createdAt),
  }));
}

const HEADERS: { key: keyof ExportRow; label: string }[] = [
  { key: "protocolo", label: "Protocolo" },
  { key: "paciente", label: "Paciente" },
  { key: "procedimento", label: "Procedimento" },
  { key: "medico", label: "Médico" },
  { key: "convenio", label: "Convênio" },
  { key: "prioridade", label: "Prioridade" },
  { key: "status", label: "Status" },
  { key: "pendencias", label: "Pendências" },
  { key: "criadoEm", label: "Criado em" },
];

// ── CSV ────────────────────────────────────────────────────────────────────────

export function exportToCsv(requests: SurgeryRequest[]): void {
  const rows = mapToRows(requests);
  const header = HEADERS.map((h) => h.label).join(",");
  const lines = rows.map((row) =>
    HEADERS.map((h) => sanitizeCsvField(row[h.key])).join(","),
  );
  const csv = [header, ...lines].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, `solicitacoes-cirurgicas-${dateStamp()}.csv`);
}

// ── PDF (HTML → print) ────────────────────────────────────────────────────────

export function exportToPdf(requests: SurgeryRequest[]): void {
  const rows = mapToRows(requests);
  const now = new Date().toLocaleString("pt-BR");

  const priorityConfig: Record<
    string,
    { bg: string; text: string; icon: string }
  > = {
    Baixa: { bg: "#D4EFE0", text: "#1E6F47", icon: "↓" },
    Média: { bg: "#D8E8F7", text: "#1859A3", icon: "→" },
    Alta: { bg: "#FFF3D6", text: "#996600", icon: "↑" },
    Urgente: { bg: "#F4E1E3", text: "#7A3B3F", icon: "⚡" },
  };

  const statusConfig: Record<
    string,
    { bg: string; text: string; dot: string }
  > = {
    Pendente: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
    Enviada: { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
    "Em Análise": { bg: "#E0E7FF", text: "#3730A3", dot: "#6366F1" },
    "Em Agendamento": { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
    Agendada: { bg: "#CCFBF1", text: "#115E59", dot: "#14B8A6" },
    Realizada: { bg: "#D1FAE5", text: "#065F46", dot: "#059669" },
    Faturada: { bg: "#E0E7FF", text: "#3730A3", dot: "#6366F1" },
    Finalizada: { bg: "#F3F4F6", text: "#374151", dot: "#6B7280" },
    Encerrada: { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
  };

  const priorityBadge = (p: string) => {
    const c = priorityConfig[p] ?? {
      bg: "#f3f4f6",
      text: "#374151",
      icon: "•",
    };
    return `<span class="badge" style="background:${c.bg};color:${c.text}">${c.icon} ${p}</span>`;
  };

  const statusBadge = (s: string) => {
    const c = statusConfig[s] ?? {
      bg: "#F3F4F6",
      text: "#374151",
      dot: "#9CA3AF",
    };
    return `<span class="badge" style="background:${c.bg};color:${c.text}"><span class="dot" style="background:${c.dot}"></span>${s}</span>`;
  };

  const countByStatus = (statuses: string[]) =>
    rows.filter((r) => statuses.includes(r.status)).length;
  const countByPriority = (priorities: string[]) =>
    rows.filter((r) => priorities.includes(r.prioridade)).length;

  const tableRows = rows
    .map(
      (r, i) => `
    <tr class="${i % 2 === 0 ? "even" : "odd"}">
      <td class="cell proto">${r.protocolo}</td>
      <td class="cell">${r.paciente}</td>
      <td class="cell proc">${r.procedimento}</td>
      <td class="cell">${r.medico}</td>
      <td class="cell">${r.convenio}</td>
      <td class="cell center">${priorityBadge(r.prioridade)}</td>
      <td class="cell center">${statusBadge(r.status)}</td>
      <td class="cell center">${r.pendencias}</td>
      <td class="cell date">${r.criadoEm}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Solicitações Cirúrgicas — Inexci</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 10mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937; background:#fff; font-size:10px; }

    /* ── Header ── */
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
    .header-meta { margin-left:auto; text-align:right; font-size:9px; opacity:.8; line-height:1.5; }

    /* ── Summary Cards ── */
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
    .card-2 { background:#fef3c7; } .card-2::before { background:#f59e0b; }
    .card-3 { background:#fef2f2; } .card-3::before { background:#ef4444; }
    .card-4 { background:#ede9fe; } .card-4::before { background:#8b5cf6; }
    .card .num { font-size:20px; font-weight:800; color:#111827; line-height:1; }
    .card .lbl { font-size:8px; color:#6b7280; margin-top:3px; text-transform:uppercase; letter-spacing:.5px; font-weight:600; }

    /* ── Table ── */
    table { width:100%; border-collapse:separate; border-spacing:0; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
    thead th {
      padding:8px 6px; text-align:left; font-size:7.5px; font-weight:700;
      text-transform:uppercase; letter-spacing:.6px; color:#6b7280;
      background:#f9fafb; border-bottom:2px solid #e5e7eb;
    }
    .cell { padding:7px 6px; border-bottom:1px solid #f3f4f6; font-size:9px; line-height:1.3; vertical-align:middle; }
    .even { background:#fff; }
    .odd { background:#fafbfc; }
    .proto { font-weight:600; color:#0f766e; white-space:nowrap; font-size:8.5px; }
    .proc { max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .center { text-align:center; }
    .date { white-space:nowrap; color:#6b7280; font-size:8.5px; }

    /* ── Badges ── */
    .badge {
      display:inline-flex; align-items:center; gap:3px;
      padding:2px 7px; border-radius:99px;
      font-size:8px; font-weight:600; white-space:nowrap;
    }
    .dot { width:5px; height:5px; border-radius:50%; display:inline-block; flex-shrink:0; }

    /* ── Footer ── */
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
    <div class="header-icon">📋</div>
    <div class="header-text">
      <h1>Solicitações Cirúrgicas</h1>
      <p>Relatório de acompanhamento</p>
    </div>
    <div class="header-meta">Gerado em ${now}<br/>${rows.length} solicitações</div>
  </div>

  <div class="summary">
    <div class="card card-1"><div class="num">${rows.length}</div><div class="lbl">Total</div></div>
    <div class="card card-2"><div class="num">${countByStatus(["Pendente", "Em Análise"])}</div><div class="lbl">Pendente / Análise</div></div>
    <div class="card card-3"><div class="num">${countByPriority(["Alta", "Urgente"])}</div><div class="lbl">Alta / Urgente</div></div>
    <div class="card card-4"><div class="num">${countByStatus(["Em Agendamento", "Agendada"])}</div><div class="lbl">Agendamento</div></div>
  </div>

  <table>
    <thead>
      <tr>
        ${HEADERS.map((h) => `<th>${h.label}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

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

// ── Utilidades ─────────────────────────────────────────────────────────────────

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
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
