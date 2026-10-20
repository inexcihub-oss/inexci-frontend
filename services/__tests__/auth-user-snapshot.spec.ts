import { describe, it, expect, beforeEach, vi } from "vitest";
import type { User } from "@/types";

vi.mock("@/lib/api", () => ({
  default: { post: vi.fn(), get: vi.fn(), put: vi.fn() },
}));

import api from "@/lib/api";
import { authService, buildUserSnapshot } from "@/services/auth.service";

const usuarioCompleto = {
  id: "u-1",
  name: "Dra. Ana",
  email: "ana@x.com",
  cpf: "12345678900",
  phone: "11999999999",
  status: 1,
  role: "admin",
  accountId: "u-1",
  avatarUrl: "https://r2/avatar.png?X-Amz-Signature=abc",
  isDoctor: true,
  permissions: ["agenda"],
  doctorProfile: { crm: "123", signatureUrl: "https://r2/assinatura.png" },
  account: { ownerName: "Dono", ownerIsDoctor: true },
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
} as unknown as User;

describe("snapshot do usuário no localStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("guarda só identificação, papel e permissões", () => {
    const snapshot = buildUserSnapshot(usuarioCompleto);

    expect(snapshot).toMatchObject({
      id: "u-1",
      name: "Dra. Ana",
      email: "ana@x.com",
      role: "admin",
      permissions: ["agenda"],
    });
    for (const campo of [
      "cpf",
      "cpfMask",
      "phone",
      "avatarUrl",
      "doctorProfile",
      "account",
    ]) {
      expect(snapshot).not.toHaveProperty(campo);
    }
  });

  it("o /auth/me grava no navegador apenas o snapshot reduzido", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: usuarioCompleto });

    await authService.me();

    const salvo = localStorage.getItem("user") ?? "";
    expect(salvo).toContain("ana@x.com");
    expect(salvo).not.toContain("12345678900");
    expect(salvo).not.toContain("11999999999");
    expect(salvo).not.toContain("assinatura");
    expect(salvo).not.toContain("X-Amz-Signature");
  });
});
