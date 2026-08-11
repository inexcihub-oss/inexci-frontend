import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
  FETCH_ALL_TAKE: 1000,
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
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ];
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
      });

      const result = await patientService.getAll();

      expect(api.get).toHaveBeenCalledWith("/patients", {
        params: { take: 1000 },
      });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].id).toBe("1");
      expect(result[0].name).toBe("Paciente 1");
    });
  });

  // O backend já recorta a listagem, mas o mapper é a segunda barreira: se a
  // rota voltar a devolver o cadastro inteiro (relação nova, `select` perdido
  // num refactor), o dado clínico e o endereço morrem aqui em vez de irem
  // parar no estado de um seletor de paciente.
  describe("recorte da listagem", () => {
    const CADASTRO_COMPLETO = {
      id: "1",
      name: "Ana",
      cpf: "12345678900",
      email: "ana@example.com",
      phone: "11988880000",
      birthDate: "1990-05-02",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      medicalNotes: "Alérgica a dipirona",
      address: "Rua das Flores",
      zipCode: "01234-567",
      healthPlanNumber: "998877",
      gender: "F",
    };

    const OCULTOS = [
      "medicalNotes",
      "address",
      "zipCode",
      "healthPlanNumber",
      "gender",
    ];

    it.each([
      ["list", async () => (await patientService.list()).records],
      ["getAll", () => patientService.getAll()],
    ])("%s descarta dado clínico e endereço", async (_nome, executar) => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { total: 1, records: [CADASTRO_COMPLETO] },
      });

      const [paciente] = await executar();

      for (const campo of OCULTOS) {
        expect(paciente).not.toHaveProperty(campo);
      }
      expect(paciente).toEqual({
        id: "1",
        name: "Ana",
        cpf: "12345678900",
        email: "ana@example.com",
        phone: "11988880000",
        birthDate: "1990-05-02",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      });
    });
  });

  describe("list", () => {
    it("envia skip/take/search e devolve records + total", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          total: 42,
          records: [
            { id: "1", name: "Ana", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
          ],
        },
      });

      const result = await patientService.list({
        skip: 20,
        take: 20,
        search: "ana",
      });

      expect(api.get).toHaveBeenCalledWith("/patients", {
        params: { skip: 20, take: 20, search: "ana" },
      });
      expect(result.total).toBe(42);
      expect(result.records[0].name).toBe("Ana");
    });

    it("omite o parâmetro search quando vazio", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { total: 0, records: [] },
      });

      await patientService.list({ skip: 0, take: 20 });

      expect(api.get).toHaveBeenCalledWith("/patients", {
        params: { skip: 0, take: 20 },
      });
    });
  });

  describe("getById", () => {
    it("deve buscar o paciente via GET /patients/:id", async () => {
      const mockData = {
        id: "abc-123",
        name: "Paciente Específico",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
      });

      const result = await patientService.getById("abc-123");

      expect(api.get).toHaveBeenCalledWith("/patients/abc-123");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("abc-123");
    });

    it("deve retornar null quando o paciente não é encontrado (404)", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Not found"),
      );

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
      const payload = { name: "Novo Paciente", cpf: "12345678900" };
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
