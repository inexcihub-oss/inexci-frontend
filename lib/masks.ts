/**
 * Funções puras de máscara para inputs brasileiros.
 *
 * Todas as funções:
 *   - Recebem string crua (com ou sem máscara)
 *   - Retornam string mascarada
 *   - São tolerantes a entrada parcial (formatam o que já foi digitado)
 *   - NÃO lançam exceção
 *
 * Use `unmask()` antes de enviar valores ao backend.
 */

export type MaskKind = "cpf" | "cnpj" | "cpfCnpj" | "phone" | "cep";

/** Remove tudo que não é dígito. */
export function unmask(value: string | undefined | null): string {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
}

/** XXX.XXX.XXX-XX (até 11 dígitos). */
export function maskCpf(raw: string | undefined | null): string {
  const d = unmask(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** XX.XXX.XXX/XXXX-XX (até 14 dígitos). */
export function maskCnpj(raw: string | undefined | null): string {
  const d = unmask(raw).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Alterna entre máscara de CPF (até 11) e CNPJ (12+). */
export function maskCpfCnpj(raw: string | undefined | null): string {
  const d = unmask(raw);
  return d.length <= 11 ? maskCpf(d) : maskCnpj(d);
}

/** (XX) XXXX-XXXX ou (XX) XXXXX-XXXX (até 11 dígitos). */
export function maskPhone(raw: string | undefined | null): string {
  const d = unmask(raw).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** XXXXX-XXX (até 8 dígitos). */
export function maskCep(raw: string | undefined | null): string {
  const d = unmask(raw).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Aplica a máscara correspondente ao kind. */
export function applyMask(kind: MaskKind, raw: string | undefined | null): string {
  switch (kind) {
    case "cpf":
      return maskCpf(raw);
    case "cnpj":
      return maskCnpj(raw);
    case "cpfCnpj":
      return maskCpfCnpj(raw);
    case "phone":
      return maskPhone(raw);
    case "cep":
      return maskCep(raw);
  }
}
