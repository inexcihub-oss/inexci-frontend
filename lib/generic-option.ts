/**
 * "Outro" é o fornecedor/fabricante genérico da conta — a resposta para
 * "nenhum dos cadastrados". Espelha `shared/constants/generic-option.ts` do
 * backend, que resolve este nome para a linha marcada com `is_generic` em vez
 * de criar um cadastro no catálogo da clínica.
 *
 * Serve a dois usos: completar os slots quando o item OPME não tem os 3
 * fornecedores/fabricantes que a plataforma exige, e registrar que o convênio
 * aprovou alguém fora dos cotados.
 */
export const GENERIC_OPTION_NAME = "Outro";

/** Mínimo de fornecedores e de fabricantes por item OPME. */
export const MIN_OPME_OPTIONS = 3;

/**
 * Nomes que significam o genérico. O plural é o que o preenchimento automático
 * gravava antes de o genérico existir como linha própria, e continua chegando
 * de solicitação antiga e de modelo salvo.
 */
const GENERIC_OPTION_ALIASES = ["outro", "outros"];

export function isGenericOptionName(name: string): boolean {
  return GENERIC_OPTION_ALIASES.includes(name.trim().toLowerCase());
}

/** Traz o plural legado para o nome canônico, sem tocar no resto. */
export function canonicalizeOptionName(name: string): string {
  return isGenericOptionName(name) ? GENERIC_OPTION_NAME : name;
}

/**
 * Completa a lista com "Outro" até o mínimo.
 *
 * O padding não sobrevive ao banco: a junção `(item, fornecedor)` é única,
 * então três "Outro" viram uma linha só e o item volta da API abaixo do
 * mínimo — por isso ele é reaplicado na exibição.
 */
export function padWithGenericOption(
  names: string[],
  alreadyCounted = 0,
): string[] {
  const out = names.map(canonicalizeOptionName);
  while (alreadyCounted + out.length < MIN_OPME_OPTIONS) {
    out.push(GENERIC_OPTION_NAME);
  }
  return out;
}
