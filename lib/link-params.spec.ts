import { afterEach, describe, expect, it } from "vitest";
import { clearLinkParams, readLinkParams } from "./link-params";

describe("link-params", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("lê e-mail e token do fragmento", () => {
    const params = readLinkParams({
      search: "",
      hash: "#email=fulano%40exemplo.com&token=123456",
    });

    expect(params.get("email")).toBe("fulano@exemplo.com");
    expect(params.get("token")).toBe("123456");
  });

  it("aceita links antigos com query string", () => {
    const params = readLinkParams({
      search: "?email=a%40b.com&token=999",
      hash: "",
    });

    expect(params.get("email")).toBe("a@b.com");
    expect(params.get("token")).toBe("999");
  });

  it("o fragmento prevalece sobre a query", () => {
    const params = readLinkParams({
      search: "?token=antigo",
      hash: "#token=novo",
    });

    expect(params.get("token")).toBe("novo");
  });

  it("remove token e e-mail da barra de endereço", () => {
    window.history.replaceState(
      {},
      "",
      "/primeiro-acesso?email=a%40b.com&token=1&utm=x#token=2",
    );

    clearLinkParams(["email", "token"]);

    expect(window.location.pathname).toBe("/primeiro-acesso");
    expect(window.location.search).toBe("?utm=x");
    expect(window.location.hash).toBe("");
  });
});
