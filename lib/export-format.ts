/**
 * Regras de formatação compartilhadas pelos exportadores (agenda e kanban).
 * Viviam duplicadas nos dois e divergiam a cada ajuste.
 */

/**
 * O Excel em pt-BR lê o CSV pelo separador de lista do locale, que é `;` — a
 * vírgula ali é o separador decimal. Com vírgula, a planilha inteira cai numa
 * coluna só.
 */
export const CSV_SEPARATOR = ";";

/**
 * Prepara um valor para o CSV: neutraliza fórmula e protege o separador.
 *
 * Um valor que começa com `=`, `+`, `-` ou `@` é avaliado como fórmula ao abrir
 * a planilha; o apóstrofo o mantém como texto. As aspas só entram quando o
 * próprio dado tem o separador, aspas ou quebra de linha — vírgula não precisa,
 * já que não separa nada.
 */
export function sanitizeCsvValue(value: string): string {
  const safeValue = /^[=+\-@]/.test(value) ? `\'${value}` : value;
  return /[";\n]/.test(safeValue)
    ? `"${safeValue.replace(/"/g, '""')}"`
    : safeValue;
}

/**
 * Deixa o texto codificável pelas fontes padrão do PDF, que usam WinAnsi.
 *
 * Acentos passam. Travessão vira hífen para não sumir. O resto é descartado:
 * setas, emoji e afins fazem o pdf-lib lançar no meio do desenho, derrubando o
 * relatório inteiro. Os controles C1 (U+0080-U+009F) caem dentro do Latin-1 mas
 * o WinAnsi também não os codifica — por isso o filtro não é só `\x20-\xFF`.
 */
export function pdfText(value: string): string {
  return value
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

/** Só o que `truncatePdfText` precisa de uma fonte do pdf-lib. */
export interface PdfFont {
  widthOfTextAtSize: (text: string, size: number) => number;
}

/** Encurta com reticências até caber em `maxWidth`. */
export function truncatePdfText(
  value: string,
  maxWidth: number,
  font: PdfFont,
  size: number,
): string {
  const text = pdfText(value);
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;

  let result = text;
  while (
    result.length &&
    font.widthOfTextAtSize(result + "...", size) > maxWidth
  ) {
    result = result.slice(0, -1);
  }
  return result ? result + "..." : "";
}
