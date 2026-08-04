import { describe, expect, it } from "vitest";
import { montarCsp } from "./lib/csp";

describe("CSP", () => {
  it("nao usa unsafe-inline em script-src", () => {
    const csp = montarCsp("abc123", "https://api.inexci.com.br");
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).not.toContain("unsafe-inline");
  });

  it("inclui o nonce em script-src", () => {
    expect(montarCsp("abc123", "https://api.inexci.com.br")).toContain(
      "'nonce-abc123'",
    );
  });

  it("restringe connect-src a self e a origem da API", () => {
    const csp = montarCsp("abc123", "https://api.inexci.com.br");
    const connectSrc = csp.split(";").find((d) => d.trim().startsWith("connect-src"));
    expect(connectSrc).toContain("https://api.inexci.com.br");
    // 'https:' generico permitia exfiltrar para qualquer host.
    expect(connectSrc).not.toMatch(/\shttps:(\s|$)/);
  });

  it("dashboard (isLanding=false) nao recebe dominios de analytics", () => {
    const csp = montarCsp("abc123", "https://api.inexci.com.br", false);
    expect(csp).not.toContain("google-analytics.com");
    expect(csp).not.toContain("facebook.com");
  });

  it("connect-src sempre libera o ViaCEP (usado no dashboard, nao so na landing)", () => {
    const dashboard = montarCsp("abc123", "https://api.inexci.com.br", false);
    const landing = montarCsp("abc123", "https://api.inexci.com.br", true);
    expect(dashboard).toContain("https://viacep.com.br");
    expect(landing).toContain("https://viacep.com.br");
  });

  it("landing (isLanding=true) libera analytics em connect-src e img-src", () => {
    const csp = montarCsp("abc123", "https://api.inexci.com.br", true);
    const connectSrc = csp.split(";").find((d) => d.trim().startsWith("connect-src"));
    const imgSrc = csp.split(";").find((d) => d.trim().startsWith("img-src"));
    expect(connectSrc).toContain("google-analytics.com");
    expect(imgSrc).toContain("facebook.com");
  });

  it("producao (isDev=false) nao inclui unsafe-eval", () => {
    const csp = montarCsp("abc123", "https://api.inexci.com.br", false, false);
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("dev (isDev=true) inclui unsafe-eval para o Fast Refresh do Next", () => {
    const csp = montarCsp("abc123", "https://api.inexci.com.br", false, true);
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).toContain("'unsafe-eval'");
  });
});
