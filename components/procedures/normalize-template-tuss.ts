export interface TemplateTussCreatePayload {
  tussCode: string;
  name: string;
  quantity: number;
}

export interface TemplateTussExtraction {
  items: TemplateTussCreatePayload[];
  /** Itens descartados por repetirem um código já presente, para avisar o usuário. */
  duplicadosIgnorados: string[];
}

/**
 * Normaliza os itens TUSS de um modelo para `POST /surgery-requests/procedures`.
 *
 * Duas armadilhas justificam esta função existir:
 *
 * 1. O item guardado no modelo carrega o `id` do item da SC de origem (e, em
 *    modelos antigos, um `procedureId`). Nenhum dos dois pode ser reenviado: o
 *    código TUSS vem de `tuss.json`, que não tem uuid, e o id do novo item é
 *    gerado pelo banco.
 * 2. O backend recusa o payload inteiro quando o mesmo `tussCode` aparece duas
 *    vezes. Um modelo pode ter o mesmo código em níveis cirúrgicos diferentes,
 *    então deduplicamos aqui e devolvemos o que ficou de fora — copiar 5 de 6
 *    itens avisando é melhor que perder os 6 em silêncio.
 */
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
