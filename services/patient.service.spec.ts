import { describe, it, expect, vi, beforeEach } from "vitest";

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
import { patientService } from "./patient.service";

describe("patientService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("deve chamar GET /patients", async () => {
      const mockData = [
        {
          id: "1",
          name: "Paciente 1",
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ];
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
      });

      const result = await patientService.getAll();

      expect(api.get).toHaveBeenCalledWith("/patients");
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].id).toBe("1");
      expect(result[0].name).toBe("Paciente 1");
    });
  });

  describe("getById", () => {
    it("deve buscar paciente via GET /patients com params e não buscar todos", async () => {
      const mockData = [
        {
          id: "abc-123",
          name: "Paciente Específico",
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ];
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
      });

      const result = await patientService.getById("abc-123");

      expect(api.get).toHaveBeenCalledWith("/patients", {
        params: { skip: 0, take: 1 },
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe("abc-123");
    });

    it("deve retornar null quando paciente não é encontrado", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [],
      });

      const result = await patientService.getById("inexistente");

      expect(result).toBeNull();
    });

    it("deve retornar null em caso de erro", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      const result = await patientService.getById("abc-123");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("deve chamar POST /patients com payload", async () => {
      const payload = { name: "Novo Paciente" };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "2", ...payload },
      });

      const result = await patientService.create(payload);

      expect(api.post).toHaveBeenCalledWith("/patients", payload);
      expect(result.name).toBe("Novo Paciente");
    });
  });

  describe("update", () => {
    it("deve chamar PATCH /patients/:id", async () => {
      const payload = { name: "Atualizado" };
      (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "1", ...payload },
      });

      const result = await patientService.update("1", payload);

      expect(api.patch).toHaveBeenCalledWith("/patients/1", payload);
      expect(result.name).toBe("Atualizado");
    });
  });

  describe("delete", () => {
    it("deve chamar DELETE /patients/:id", async () => {
      (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await patientService.delete("1");

      expect(api.delete).toHaveBeenCalledWith("/patients/1");
    });
  });
});
