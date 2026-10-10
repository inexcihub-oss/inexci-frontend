import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSignedUrl, warn } = vi.hoisted(() => ({
  getSignedUrl: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/services/upload.service", () => ({
  uploadService: { getSignedUrl },
}));
vi.mock("@/lib/logger", () => ({ logger: { warn } }));

import { resolveSignedUrl } from "./signed-url";

describe("resolveSignedUrl", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devolve null sem caminho, sem chamar a API", async () => {
    expect(await resolveSignedUrl(null)).toBeNull();
    expect(await resolveSignedUrl("")).toBeNull();
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("passa URLs absolutas direto", async () => {
    expect(await resolveSignedUrl("https://cdn/x.png")).toBe(
      "https://cdn/x.png",
    );
    expect(await resolveSignedUrl("http://cdn/x.png")).toBe("http://cdn/x.png");
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("assina caminhos relativos do storage", async () => {
    getSignedUrl.mockResolvedValue("https://r2/assinada");
    expect(await resolveSignedUrl("avatars/a.png")).toBe("https://r2/assinada");
    expect(getSignedUrl).toHaveBeenCalledWith("avatars/a.png");
  });

  it("registra a falha e devolve null em vez de lançar", async () => {
    getSignedUrl.mockRejectedValue(new Error("403"));
    expect(await resolveSignedUrl("signatures/s.png")).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
