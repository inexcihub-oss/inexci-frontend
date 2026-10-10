import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

import api from "@/lib/api";
import { userService } from "./user.service";

describe("userService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProfile", () => {
    it("deve chamar GET /users/profile", async () => {
      const mockProfile = {
        id: "user-1",
        name: "Dr. João",
        email: "joao@email.com",
        role: "admin",
        isDoctor: true,
        doctorProfile: {
          crm: "123456",
          crmState: "SP",
        },
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockProfile,
      });

      const result = await userService.getProfile();

      expect(api.get).toHaveBeenCalledWith("/users/profile");
      expect(result).toEqual(mockProfile);
    });

    it("deve retornar campos de médico no perfil", async () => {
      const mockProfile = {
        id: "user-2",
        name: "Dr. Carlos",
        isDoctor: true,
        doctorProfile: {
          crm: "654321",
          crmState: "RJ",
          signatureUrl: "https://example.com/sig.png",
        },
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockProfile,
      });

      const result = await userService.getProfile();

      expect(result.isDoctor).toBe(true);
      expect(result.doctorProfile?.crm).toBe("654321");
      expect(result.doctorProfile?.signatureUrl).toBe(
        "https://example.com/sig.png",
      );
    });
  });

  describe("updateProfile", () => {
    it("deve chamar PUT /users/profile com dados", async () => {
      const updateData = {
        name: "Dr. Updated",
        phone: "11999999999",
      };
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "user-1", ...updateData },
      });

      const result = await userService.updateProfile(updateData);

      expect(api.put).toHaveBeenCalledWith("/users/profile", updateData);
      expect(result.name).toBe("Dr. Updated");
    });
  });

  describe("updateProfile — cache do perfil", () => {
    async function carregarComCache() {
      vi.stubEnv("NODE_ENV", "development");
      vi.resetModules();
      const apiMod = (await import("@/lib/api")).default;
      const { userService: svc } = await import("./user.service");
      return { apiMod, svc };
    }

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("resposta completa (formato do GET) é reaproveitada pelo getProfile", async () => {
      const { apiMod, svc } = await carregarComCache();
      (apiMod.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "u-1", name: "Dr. A", isDoctor: true },
      });

      await svc.updateProfile({ name: "Dr. A" });
      const perfil = await svc.getProfile();

      expect(apiMod.get).not.toHaveBeenCalled();
      expect(perfil.isDoctor).toBe(true);
    });

    it("resposta parcial (sem isDoctor) não vira cache: getProfile busca de novo", async () => {
      const { apiMod, svc } = await carregarComCache();
      (apiMod.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "u-1", name: "Dr. A" },
      });
      (apiMod.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "u-1", name: "Dr. A", isDoctor: true },
      });

      await svc.updateProfile({ name: "Dr. A" });
      const perfil = await svc.getProfile();

      expect(apiMod.get).toHaveBeenCalledWith("/users/profile");
      expect(perfil.isDoctor).toBe(true);
    });
  });
});
