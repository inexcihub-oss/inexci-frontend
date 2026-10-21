export function parseBRLValue(str: string): number {
  const cleaned = str
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(cleaned);
}

export function applyBRLMask(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits === "") return "";
  const padded = digits.padStart(3, "0");
  const cents = padded.slice(-2);
  const intRaw = padded.slice(0, -2).replace(/^0+/, "") || "0";
  const intFormatted = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${intFormatted},${cents}`;
}

export function numberToBRLMask(value: number): string {
  return applyBRLMask(Math.round(value * 100).toString());
}

export function decimalToCents(
  value: string | number | null | undefined,
): number {
  if (value === null || value === undefined || value === "") return 0;
  const texto = typeof value === "number" ? value.toFixed(2) : value.trim();
  const negativo = texto.startsWith("-");
  const [inteiro = "0", fracao = ""] = texto.replace(/^[-+]/, "").split(".");
  const centavos =
    Number(inteiro || "0") * 100 + Number((fracao + "00").slice(0, 2));
  if (!Number.isFinite(centavos)) return 0;
  return negativo ? -centavos : centavos;
}

export function centsToDecimal(cents: number): string {
  const negativo = cents < 0;
  const absoluto = Math.abs(Math.round(cents));
  const texto = `${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, "0")}`;
  return negativo ? `-${texto}` : texto;
}

export function brlMaskToDecimal(masked: string): string {
  const digits = masked.replace(/\D/g, "");
  if (digits === "") return "";
  return centsToDecimal(Number(digits));
}

export function decimalToBRLMask(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "";
  return applyBRLMask(String(decimalToCents(value)));
}

export function formatMoney(value: string | number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(decimalToCents(value) / 100);
}
