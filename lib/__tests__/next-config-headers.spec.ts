/**
 * Testes para headers de segurança configurados em next.config.mjs.
 *
 * Em vitest NODE_ENV = "test", portanto isProd = false (comportamento de dev).
 * Para validar headers de produção (HSTS), fazemos verificação estática do source.
 */
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
    expect(h!.value).toContain("camera=()");
    expect(h!.value).toContain("microphone=()");
  });

  it("deve incluir Content-Security-Policy com default-src e frame-ancestors", () => {
    const h = headers.find((h) => h.key === "Content-Security-Policy");
    expect(h).toBeDefined();
    expect(h!.value).toContain("default-src 'self'");
    expect(h!.value).toContain("frame-ancestors 'none'");
  });

  it("NÃO deve incluir HSTS fora de produção", () => {
    const h = headers.find((h) => h.key === "Strict-Transport-Security");
    expect(h).toBeUndefined();
  });

  it("CSP em dev/test deve conter unsafe-eval (HMR)", () => {
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp!.value).toContain("unsafe-eval");
  });

  it("CSP em dev/test deve permitir WebSocket local", () => {
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp!.value).toContain("ws://localhost:*");
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
    // Verifica que HSTS está dentro de um bloco condicional isProd
    expect(configSource).toMatch(/isProd[\s\S]*Strict-Transport-Security/);
  });
});
