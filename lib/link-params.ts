export function readLinkParams(
  location: Pick<Location, "hash" | "search"> = window.location,
): URLSearchParams {
  const params = new URLSearchParams(location.search);
  const hash = location.hash.startsWith("#")
    ? location.hash.slice(1)
    : location.hash;
  new URLSearchParams(hash).forEach((value, key) => {
    params.set(key, value);
  });
  return params;
}

export function clearLinkParams(keys: readonly string[]): void {
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (url.hash) {
    url.hash = "";
    changed = true;
  }
  if (changed) {
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}`,
    );
  }
}
