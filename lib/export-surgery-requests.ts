/**
 * Utilitário de exportação de solicitações cirúrgicas (CSV e PDF)
 * Gera arquivos client-side a partir dos dados já carregados no kanban.
 */

import { SurgeryRequest, PRIORITY_LABELS } from "@/types/surgery-request.types";
import {
  CSV_SEPARATOR,
  pdfText,
  sanitizeCsvValue,
  truncatePdfText,
} from "./export-format";

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
  const header = HEADERS.map((h) => h.label).join(CSV_SEPARATOR);
  const lines = rows.map((row) =>
    HEADERS.map((h) => sanitizeCsvValue(row[h.key])).join(CSV_SEPARATOR),
  );
  const csv = [header, ...lines].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, `solicitacoes-cirurgicas-${dateStamp()}.csv`);
}

// ── PDF ───────────────────────────────────────────────────────────────────────

/**
 * Gera o relatório das solicitações do kanban e baixa no dispositivo.
 *
 * Segue o mesmo desenho de `exportAgendaToPdf`: A4 deitado, cabeçalho teal,
 * tabela zebrada e rodapé paginado.
 */
export async function exportToPdf(requests: SurgeryRequest[]): Promise<void> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const rows = mapToRows(requests);
  const geradoEm = new Date().toLocaleString("pt-BR");
  const contaPorStatus = (status: string[]) =>
    rows.filter((row) => status.includes(row.status)).length;
  const contaPorPrioridade = (prioridade: string[]) =>
    rows.filter((row) => prioridade.includes(row.prioridade)).length;

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const width = 841.89;
  const height = 595.28;
  const margin = 28;
  const headerHeight = 62;
  const rowHeight = 18;
  const tableWidth = width - margin * 2;
  const columnWidth = tableWidth / HEADERS.length;
  const textSize = 7;
  const maxRowsPerPage = Math.max(
    1,
    Math.floor((height - margin * 2 - headerHeight - rowHeight * 2) / rowHeight),
  );
  const chunks = rows.length
    ? Array.from(
        { length: Math.ceil(rows.length / maxRowsPerPage) },
        (_, index) =>
          rows.slice(index * maxRowsPerPage, (index + 1) * maxRowsPerPage),
      )
    : [[]];

  const resumo = [
    `${rows.length} ${rows.length === 1 ? "solicitação" : "solicitações"}`,
    `Pendente/Análise: ${contaPorStatus(["Pendente", "Em Análise"])}`,
    `Alta/Urgente: ${contaPorPrioridade(["Alta", "Urgente"])}`,
    `Agendamento: ${contaPorStatus(["Em Agendamento", "Agendada"])}`,
  ].join("  |  ");

  chunks.forEach((pageRows, pageIndex) => {
    const page = pdf.addPage([width, height]);

    page.drawRectangle({
      x: margin,
      y: height - margin - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: rgb(0.059, 0.463, 0.431),
    });
    page.drawText(pdfText("Solicitações Cirúrgicas"), {
      x: margin + 14,
      y: height - margin - 25,
      size: 16,
      font: bold,
      color: rgb(1, 1, 1),
    });
    page.drawText(pdfText(`Relatório gerado em ${geradoEm}`), {
      x: margin + 14,
      y: height - margin - 41,
      size: 8,
      font: regular,
      color: rgb(1, 1, 1),
    });
    page.drawText(pdfText(resumo), {
      x: margin,
      y: height - margin - headerHeight - 15,
      size: 8,
      font: bold,
      color: rgb(0.12, 0.16, 0.2),
    });

    const headerY = height - margin - headerHeight - 31;
    HEADERS.forEach((column, index) => {
      const x = margin + index * columnWidth;
      page.drawRectangle({
        x,
        y: headerY - rowHeight + 3,
        width: columnWidth,
        height: rowHeight,
        color: rgb(0.95, 0.96, 0.97),
        borderColor: rgb(0.82, 0.84, 0.86),
        borderWidth: 0.3,
      });
      page.drawText(
        truncatePdfText(column.label.toUpperCase(), columnWidth - 6, bold, textSize),
        {
          x: x + 3,
          y: headerY - 9,
          size: textSize,
          font: bold,
          color: rgb(0.24, 0.27, 0.3),
        },
      );
    });

    if (!pageRows.length) {
      page.drawText(
        pdfText("Nenhuma solicitação encontrada para os filtros selecionados."),
        {
          x: margin + 4,
          y: headerY - rowHeight - 15,
          size: 9,
          font: regular,
          color: rgb(0.4, 0.43, 0.47),
        },
      );
    }

    pageRows.forEach((row, rowIndex) => {
      const y = headerY - rowHeight * (rowIndex + 1);
      HEADERS.forEach((column, columnIndex) => {
        const x = margin + columnIndex * columnWidth;
        page.drawRectangle({
          x,
          y: y - rowHeight + 3,
          width: columnWidth,
          height: rowHeight,
          color: rowIndex % 2 ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1),
          borderColor: rgb(0.87, 0.88, 0.89),
          borderWidth: 0.25,
        });
        page.drawText(
          truncatePdfText(row[column.key], columnWidth - 6, regular, textSize),
          {
            x: x + 3,
            y: y - 9,
            size: textSize,
            font: regular,
            color: rgb(0.12, 0.16, 0.2),
          },
        );
      });
    });

    page.drawText(`Inexci | Página ${pageIndex + 1} de ${chunks.length}`, {
      x: margin,
      y: margin - 4,
      size: 7,
      font: regular,
      color: rgb(0.45, 0.48, 0.52),
    });
  });

  const bytes = await pdf.save();
  // A cópia garante um ArrayBuffer próprio, compatível com Blob nos tipos DOM.
  const pdfBytes = new Uint8Array(bytes);
  downloadBlob(
    new Blob([pdfBytes.buffer], { type: "application/pdf" }),
    `solicitacoes-cirurgicas-${dateStamp()}.pdf`,
  );
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
