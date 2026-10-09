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
