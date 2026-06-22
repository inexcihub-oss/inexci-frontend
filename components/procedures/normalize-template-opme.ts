import { ProcedureOpmeItem } from "./types";

export interface TemplateOpmeCreatePayload {
  name: string;
  quantity: number;
  manufacturerIds: string[];
  manufacturerNames: string[];
  supplierIds: string[];
  supplierNames: string[];
}

/** Extrai nome legível de string ou entidade { id, name, ... }. */
export function toOpmeDisplayName(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name.trim() : "";
  }
  return "";
}

function extractNamedRefs(values: unknown[] | undefined): {
  ids: string[];
  names: string[];
} {
  const ids: string[] = [];
  const names: string[] = [];

  for (const value of values ?? []) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) names.push(trimmed);
      continue;
    }

    if (value && typeof value === "object") {
      const obj = value as { id?: unknown; name?: unknown };
      const id = String(obj.id ?? "").trim();
      const name = typeof obj.name === "string" ? obj.name.trim() : "";

      if (id) {
        ids.push(id);
      } else if (name) {
        names.push(name);
      }
    }
  }

  return {
    ids: Array.from(new Set(ids)),
    names: Array.from(new Set(names)),
  };
}

export function getTemplateOpmeItemsRaw(
  templateData: Record<string, unknown>,
): unknown[] {
  const items = templateData.opmeItems;
  return Array.isArray(items) ? items : [];
}

/** Normaliza itens OPME do template para criação via API. */
export function extractTemplateOpmeItemsForCreate(
  templateData: Record<string, unknown>,
): TemplateOpmeCreatePayload[] {
  return getTemplateOpmeItemsRaw(templateData)
    .map((item) => {
      const raw =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};

      const suppliersSource = Array.isArray(raw.suppliers)
        ? raw.suppliers
        : raw.distributor
          ? [raw.distributor]
          : raw.supplier
            ? [raw.supplier]
            : [];

      const manufacturers = extractNamedRefs(
        raw.manufacturers as unknown[] | undefined,
      );
      const suppliers = extractNamedRefs(suppliersSource);

      return {
        name: String(raw.name ?? "").trim(),
        quantity: Number(raw.quantity) || 1,
        manufacturerIds: manufacturers.ids,
        manufacturerNames: manufacturers.names,
        supplierIds: suppliers.ids,
        supplierNames: suppliers.names,
      };
    })
    .filter((item) => item.name.length > 0);
}

export function toOpmeDisplayNames(values: unknown[] | undefined): string[] {
  if (!values?.length) return [];
  return values.map(toOpmeDisplayName).filter(Boolean);
}

/** Normaliza item OPME vindo do template (strings ou entidades completas). */
export function normalizeTemplateOpmeItem(
  raw: Record<string, unknown>,
  index: number,
): ProcedureOpmeItem {
  const suppliersSource = Array.isArray(raw.suppliers)
    ? raw.suppliers
    : raw.distributor
      ? [raw.distributor]
      : raw.supplier
        ? [raw.supplier]
        : [];

  return {
    id: String(raw.id ?? index),
    name: String(raw.name ?? ""),
    quantity: Number(raw.quantity) || 1,
    manufacturers: toOpmeDisplayNames(
      raw.manufacturers as unknown[] | undefined,
    ),
    suppliers: toOpmeDisplayNames(suppliersSource),
  };
}

export function normalizeTemplateOpmeItems(
  items: unknown[] | undefined,
): ProcedureOpmeItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) =>
    normalizeTemplateOpmeItem(
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {},
      index,
    ),
  );
}
