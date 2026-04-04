import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo api antes de importar os serviços
vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}));

import api from "@/lib/api";
import { collaboratorService } from "./collaborator.service";

/**
 * PRD: Reformulação Usuários/Permissões — US-004
 * Testa chamadas HTTP do collaboratorService.
 */
describe("collaboratorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("deve chamar GET /users/collaborators", async () => {
      const mockData = [
        { id: "1", name: "Colaborador 1", email: "c1@test.com" },
      ];
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
      });

      const result = await collaboratorService.getAll();

      expect(api.get).toHaveBeenCalledWith("/users/collaborators");
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].id).toBe("1");
      expect(result[0].name).toBe("Colaborador 1");
    });
  });

  describe("create", () => {
    it("deve chamar POST /users/collaborators com payload", async () => {
      const payload = {
        name: "Maria",
        email: "maria@email.com",
        is_doctor: false,
      };
      const mockResponse = { id: "new-1", ...payload };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      });

      const result = await collaboratorService.create(payload);

      expect(api.post).toHaveBeenCalledWith("/users/collaborators", payload);
      expect(result).toEqual(mockResponse);
    });

    it("deve enviar dados de médico quando is_doctor=true", async () => {
      const payload = {
        name: "Dr. João",
        email: "joao@email.com",
        is_doctor: true,
        crm: "123456",
        crm_state: "SP",
        specialty: "Ortopedia",
      };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "doc-1", ...payload },
      });

      await collaboratorService.create(payload);

      expect(api.post).toHaveBeenCalledWith(
        "/users/collaborators",
        expect.objectContaining({
          is_doctor: true,
          crm: "123456",
          crm_state: "SP",
        }),
      );
    });
  });

  describe("update", () => {
    it("deve chamar PATCH /users/collaborators/:id", async () => {
      const payload = { name: "Novo Nome" };
      (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "c-1", name: "Novo Nome" },
      });

      await collaboratorService.update("c-1", payload);

      expect(api.patch).toHaveBeenCalledWith(
        "/users/collaborators/c-1",
        payload,
      );
    });
  });

  describe("delete", () => {
    it("deve chamar DELETE /users/collaborators/:id", async () => {
      (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await collaboratorService.delete("c-1");

      expect(api.delete).toHaveBeenCalledWith("/users/collaborators/c-1");
    });
  });

  describe("getDoctors", () => {
    it("deve chamar GET /users com role=doctor", async () => {
      const mockDoctors = [{ id: "1", name: "Dr. Silva" }];
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockDoctors,
      });

      const result = await collaboratorService.getDoctors();

      expect(api.get).toHaveBeenCalledWith(expect.stringContaining("/users"));
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
