export const GENERIC_OPTION_NAME = "Outro";

export const MIN_OPME_OPTIONS = 3;

const GENERIC_OPTION_ALIASES = ["outro", "outros"];

export function isGenericOptionName(name: string): boolean {
  return GENERIC_OPTION_ALIASES.includes(name.trim().toLowerCase());
}

export function canonicalizeOptionName(name: string): string {
  return isGenericOptionName(name) ? GENERIC_OPTION_NAME : name;
}

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
