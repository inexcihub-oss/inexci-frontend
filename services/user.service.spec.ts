import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo api
vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/services/upload.service", () => ({
  uploadService: {
    uploadSingle: vi.fn(),
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
        id: "user-1",
        name: "Dr. João",
        email: "joao@email.com",
        role: "admin",
        is_doctor: true,
        doctor_profile: {
          crm: "123456",
          crm_state: "SP",
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
        is_doctor: true,
        doctor_profile: {
          crm: "654321",
          crm_state: "RJ",
          signature_url: "https://example.com/sig.png",
        },
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockProfile,
      });

      const result = await userService.getProfile();

      expect(result.is_doctor).toBe(true);
      expect(result.doctor_profile?.crm).toBe("654321");
      expect(result.doctor_profile?.signature_url).toBe(
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
    it("deve chamar GET /users/one com query param id", async () => {
      const mockUser = { id: "u-1", name: "João" };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockUser,
      });

      const result = await userService.getById("u-1");

      expect(api.get).toHaveBeenCalledWith("/users/one", {
        params: { id: "u-1" },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe("uploadAvatar", () => {
    it("deve fazer upload e atualizar perfil com avatar_url", async () => {
      const { uploadService } = await import("@/services/upload.service");
      (
        uploadService.uploadSingle as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        message: "ok",
        data: {
          url: "https://storage.example.com/avatars/photo.jpg",
          path: "avatars/photo.jpg",
        },
      });
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          id: "u-1",
          name: "Test",
          avatar_url: "https://storage.example.com/avatars/photo.jpg",
        },
      });

      const file = new File(["test"], "photo.jpg", { type: "image/jpeg" });
      const result = await userService.uploadAvatar(file);

      expect(uploadService.uploadSingle).toHaveBeenCalledWith(file, "avatars");
      expect(api.put).toHaveBeenCalledWith("/users/profile", {
        avatar_url: "https://storage.example.com/avatars/photo.jpg",
      });
      expect(result.avatar_url).toBe(
        "https://storage.example.com/avatars/photo.jpg",
      );
    });
  });
});
