export type MaskKind = "cpf" | "cnpj" | "cpfCnpj" | "phone" | "cep";

export function unmask(value: string | undefined | null): string {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
}

export function maskCpf(raw: string | undefined | null): string {
  const d = unmask(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskCnpj(raw: string | undefined | null): string {
  const d = unmask(raw).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function maskCpfCnpj(raw: string | undefined | null): string {
  const d = unmask(raw);
  return d.length <= 11 ? maskCpf(d) : maskCnpj(d);
}

export function maskPhone(raw: string | undefined | null): string {
  const d = unmask(raw).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCep(raw: string | undefined | null): string {
  const d = unmask(raw).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

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
