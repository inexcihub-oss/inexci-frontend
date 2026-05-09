/**
 * Helpers para resumir erros de formulário num Toast amigável.
 */

/**
 * Monta uma mensagem unificada de Toast a partir de um record de erros.
 * - Se houver labels (campo => label), usa o label.
 * - Caso contrário, usa o próprio nome do campo (humanizado).
 *
 * Exemplo:
 *   summarizeErrors({ name: "Curto", email: "Inválido" }, { name: "Nome" })
 *   => "Corrija os campos: Nome, email"
 */
export function summarizeErrors(
  errors: Record<string, string>,
  labels: Record<string, string> = {},
): string {
  const fields = Object.keys(errors);
  if (fields.length === 0) return "";
  if (fields.length === 1) {
    const f = fields[0];
    return labels[f] ? `${labels[f]}: ${errors[f]}` : errors[f];
  }
  const list = fields
    .map((f) => labels[f] ?? humanizeFieldName(f))
    .join(", ");
  return `Corrija os campos: ${list}`;
}

function humanizeFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Move o foco para o primeiro input com erro dentro de `container`.
 * Retorna `true` se conseguiu focar.
 */
export function focusFirstError(
  errors: Record<string, string>,
  container: HTMLElement | null,
): boolean {
  if (!container) return false;
  const firstField = Object.keys(errors)[0];
  if (!firstField) return false;
  const el = container.querySelector<HTMLElement>(
    `[name="${firstField}"], #${firstField}`,
  );
  if (!el) return false;
  if (typeof (el as HTMLInputElement).focus === "function") {
    (el as HTMLInputElement).focus();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  }
  return false;
}
