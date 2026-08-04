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
});
