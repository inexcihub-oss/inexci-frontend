export const CSV_SEPARATOR = ";";

export function sanitizeCsvValue(value: string): string {
  const safeValue = /^[=+\-@]/.test(value) ? `\'${value}` : value;
  return /[";\n]/.test(safeValue)
    ? `"${safeValue.replace(/"/g, '""')}"`
    : safeValue;
}

export function pdfText(value: string): string {
  return value
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

export interface PdfFont {
  widthOfTextAtSize: (text: string, size: number) => number;
}

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
