import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo api
vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import api from "@/lib/api";
import { userService } from "./user.service";

/**
 * PRD: Reformulação Usuários/Permissões — US-005 / US-007
 * Testa chamadas HTTP do userService (perfil de médico, etc.).
 */
describe("userService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProfile", () => {
    it("deve chamar GET /users/profile", async () => {
      const mockProfile = {
        id: 1,
        name: "Dr. João",
        email: "joao@email.com",
        is_admin: true,
        is_doctor: true,
        crm: "123456",
        crm_state: "SP",
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
        id: 1,
        name: "Dr. Carlos",
        is_doctor: true,
        crm: "654321",
        crm_state: "RJ",
        signature_image_url: "https://example.com/sig.png",
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockProfile,
      });

      const result = await userService.getProfile();

      expect(result.is_doctor).toBe(true);
      expect(result.crm).toBe("654321");
      expect(result.signature_image_url).toBe("https://example.com/sig.png");
    });
  });

  describe("updateProfile", () => {
    it("deve chamar PUT /users/profile com dados", async () => {
      const updateData = {
        crm: "999888",
        crm_state: "MG",
        specialty: "Cardiologia",
      };
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: 1, ...updateData },
      });

      const result = await userService.updateProfile(updateData);

      expect(api.put).toHaveBeenCalledWith("/users/profile", updateData);
      expect(result.crm).toBe("999888");
    });
  });

  describe("getAll", () => {
    it("deve chamar GET /users", async () => {
      const mockUsers = [{ id: "1", name: "Usuário 1" }];
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockUsers,
      });

      const result = await userService.getAll();

      expect(api.get).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe("getById", () => {
    it("deve chamar GET /users/:id", async () => {
      const mockUser = { id: "u-1", name: "João" };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockUser,
      });

      const result = await userService.getById("u-1");

      expect(api.get).toHaveBeenCalledWith("/users/u-1");
      expect(result).toEqual(mockUser);
    });
  });
});
