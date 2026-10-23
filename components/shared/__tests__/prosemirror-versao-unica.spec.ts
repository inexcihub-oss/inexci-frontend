import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("dependências do editor de texto", () => {
  it("instala uma única versão de cada pacote prosemirror", () => {
    const lockfile = readFileSync(join(process.cwd(), "yarn.lock"), "utf8");
    const versoes = new Map<string, number>();
    for (const linha of lockfile.split("\n")) {
      const pacote = linha.match(/^"?(prosemirror-[a-z-]+)@/)?.[1];
      if (pacote) versoes.set(pacote, (versoes.get(pacote) ?? 0) + 1);
    }

    expect(versoes.get("prosemirror-model")).toBe(1);
    const duplicados = [...versoes].filter(([, total]) => total > 1);
    expect(duplicados).toEqual([]);
  });
});
