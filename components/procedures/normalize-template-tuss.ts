export interface TemplateTussCreatePayload {
  tussCode: string;
  name: string;
  quantity: number;
}

export interface TemplateTussExtraction {
  items: TemplateTussCreatePayload[];
  duplicadosIgnorados: string[];
}

export function extractTemplateTussItemsForCreate(
  templateData: Record<string, unknown>,
): TemplateTussExtraction {
  const raw = templateData.tussItems ?? templateData.procedures;
  const source = Array.isArray(raw) ? raw : [];

  const items: TemplateTussCreatePayload[] = [];
  const duplicadosIgnorados: string[] = [];
  const codigosVistos = new Set<string>();

  for (const entry of source) {
    if (!entry || typeof entry !== "object") continue;

    const item = entry as Record<string, unknown>;
    const tussCode = String(item.tussCode ?? "").trim();
    if (!tussCode) continue;

    const name = String(item.name ?? "").trim();

    if (codigosVistos.has(tussCode)) {
      duplicadosIgnorados.push(`${name || "Item sem nome"} (${tussCode})`);
      continue;
    }
    codigosVistos.add(tussCode);

    items.push({
      tussCode,
      name,
      quantity: Number(item.quantity) || 1,
    });
  }

  return { items, duplicadosIgnorados };
}
