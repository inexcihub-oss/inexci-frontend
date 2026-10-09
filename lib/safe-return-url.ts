export function resolverReturnUrl(
  bruto: string | null | undefined,
  origem: string,
): string | null {
  if (!bruto) return null;
  try {
    const url = new URL(bruto, origem);
    if (url.origin !== new URL(origem).origin) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
