import { describe, it, expect, beforeAll } from "vitest";
import nextConfig from "../../next.config.mjs";
import fs from "fs";
import path from "path";

type Header = { key: string; value: string };

async function getHeaders(): Promise<Header[]> {
  const cfg = nextConfig as {
    headers: () => Promise<Array<{ headers: Header[] }>>;
  };
  const result = await cfg.headers();
  return result[0].headers;
}

describe("next.config.mjs — Security Headers (dev/test)", () => {
  let headers: Header[];

  beforeAll(async () => {
    headers = await getHeaders();
  });

  it("deve incluir X-Frame-Options DENY", () => {
    const h = headers.find((h) => h.key === "X-Frame-Options");
    expect(h).toBeDefined();
    expect(h!.value).toBe("DENY");
  });

  it("deve incluir X-Content-Type-Options nosniff", () => {
    const h = headers.find((h) => h.key === "X-Content-Type-Options");
    expect(h).toBeDefined();
    expect(h!.value).toBe("nosniff");
  });

  it("deve incluir Referrer-Policy", () => {
    const h = headers.find((h) => h.key === "Referrer-Policy");
    expect(h).toBeDefined();
    expect(h!.value).toBe("strict-origin-when-cross-origin");
  });

  it("deve incluir Permissions-Policy restritiva", () => {
    const h = headers.find((h) => h.key === "Permissions-Policy");
    expect(h).toBeDefined();
    expect(h!.value).toContain("camera=(self)");
    expect(h!.value).toContain("microphone=()");
  });

  it("NÃO deve incluir Content-Security-Policy (movida para o middleware)", () => {
    const h = headers.find((h) => h.key === "Content-Security-Policy");
    expect(h).toBeUndefined();
  });

  it("NÃO deve incluir HSTS fora de produção", () => {
    const h = headers.find((h) => h.key === "Strict-Transport-Security");
    expect(h).toBeUndefined();
  });
});

describe("next.config.mjs — HSTS em produção (validação estática)", () => {
  let configSource: string;

  beforeAll(() => {
    configSource = fs.readFileSync(
      path.resolve(__dirname, "../../next.config.mjs"),
      "utf-8",
    );
  });

  it("deve conter header Strict-Transport-Security no source", () => {
    expect(configSource).toContain("Strict-Transport-Security");
  });

  it("deve ter max-age de 2 anos (63072000)", () => {
    expect(configSource).toContain("max-age=63072000");
  });

  it("deve incluir includeSubDomains", () => {
    expect(configSource).toContain("includeSubDomains");
  });

  it("deve incluir diretiva preload", () => {
    expect(configSource).toContain("preload");
  });

  it("deve ser condicionado a isProd (não ativar em dev)", () => {
    expect(configSource).toMatch(/isProd[\s\S]*Strict-Transport-Security/);
  });
});

describe("next.config.mjs — otimizador de imagem", () => {
  type RemotePattern = { protocol?: string; hostname: string };

  function remotePatterns(): RemotePattern[] {
    const cfg = nextConfig as { images?: { remotePatterns?: RemotePattern[] } };
    return cfg.images?.remotePatterns ?? [];
  }

  it("não libera nenhum host do R2 no /_next/image", () => {
    const hosts = remotePatterns().map((p) => p.hostname);
    expect(hosts.some((h) => h.includes("r2.cloudflarestorage.com"))).toBe(false);
  });

  it("não usa curinga de hostname", () => {
    expect(remotePatterns().some((p) => p.hostname.includes("*"))).toBe(false);
  });

  it("só libera localhost fora de produção", () => {
    for (const p of remotePatterns()) {
      expect(p.hostname).toBe("localhost");
    }
  });

  it("não declara padrão remoto em produção (validação estática)", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../next.config.mjs"),
      "utf-8",
    );
    expect(source).not.toContain("r2.cloudflarestorage.com");
    expect(source).toMatch(/isProd\s*\?\s*\[\]/);
  });
});
