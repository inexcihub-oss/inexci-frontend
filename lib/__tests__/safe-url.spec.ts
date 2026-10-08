import { afterEach, describe, expect, it, vi } from "vitest";
import { safeExternalUrl } from "../safe-url";

describe("safeExternalUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("aceita https (URL assinada do R2)", () => {
    const url =
      "https://conta.r2.cloudflarestorage.com/bucket/documents/a.pdf?X-Amz-Signature=abc";
    expect(safeExternalUrl(url)).toBe(url);
  });

  it("aceita http fora de produção, inclusive pelo IP da rede", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(safeExternalUrl("http://localhost:3002/uploads/a.pdf")).toBe(
      "http://localhost:3002/uploads/a.pdf",
    );
    expect(safeExternalUrl("http://192.168.0.10:3002/uploads/a.pdf")).toBe(
      "http://192.168.0.10:3002/uploads/a.pdf",
    );
  });

  it("em produção, aceita http só para a própria máquina", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(safeExternalUrl("http://localhost:3002/a.pdf")).toBe(
      "http://localhost:3002/a.pdf",
    );
    expect(safeExternalUrl("http://127.0.0.1:3002/a.pdf")).toBe(
      "http://127.0.0.1:3002/a.pdf",
    );
    expect(safeExternalUrl("http://exemplo.com/a.pdf")).toBeUndefined();
  });

  it("aceita caminho relativo (mesma origem)", () => {
    expect(safeExternalUrl("/uploads/a.pdf")).toBe("/uploads/a.pdf");
  });

  it.each([
    "javascript:alert(1)",
    " JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
  ])("recusa esquema perigoso: %s", (url) => {
    expect(safeExternalUrl(url)).toBeUndefined();
  });

  it("recusa vazio e ausente", () => {
    expect(safeExternalUrl("")).toBeUndefined();
    expect(safeExternalUrl(null)).toBeUndefined();
    expect(safeExternalUrl(undefined)).toBeUndefined();
  });
});
