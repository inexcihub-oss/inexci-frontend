import { describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function requisicao(host: string, caminho: string) {
  return new NextRequest(`https://${host}${caminho}`, { headers: { host } });
}

describe("middleware — roteamento por host", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("deixa /admin passar em app.inexci.com.br", () => {
    const resposta = middleware(requisicao("app.inexci.com.br", "/admin"));
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("location")).toBeNull();
  });

  it("deixa uma subrota de /admin passar em app.inexci.com.br", () => {
    const resposta = middleware(
      requisicao("app.inexci.com.br", "/admin/clientes"),
    );
    expect(resposta.headers.get("location")).toBeNull();
  });

  it("fora do domínio do app, em produção, /admin é redirecionado para o app", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.inexci.com.br");
    const resposta = middleware(requisicao("inexci.com.br", "/admin/uso"));
    expect(resposta.status).toBe(301);
    expect(resposta.headers.get("location")).toBe(
      "https://app.inexci.com.br/admin/uso",
    );
  });
});
