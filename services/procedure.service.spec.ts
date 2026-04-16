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
import { procedureService } from "./procedure.service";

describe("procedureService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("deve chamar GET /procedures", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { records: [{ id: "1", name: "Artroscopia" }] },
      });

      const result = await procedureService.getAll();

      expect(api.get).toHaveBeenCalledWith("/procedures");
      expect(result[0].name).toBe("Artroscopia");
    });
  });

  describe("getById", () => {
    it("deve chamar GET /procedures/:id", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "1", name: "Artroscopia" },
      });

      const result = await procedureService.getById("1");

      expect(api.get).toHaveBeenCalledWith("/procedures/1");
      expect(result.name).toBe("Artroscopia");
    });
  });

  describe("create", () => {
    it("deve chamar POST /procedures com payload", async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "2", name: "Nova Cirurgia" },
      });

      const result = await procedureService.create({ name: "Nova Cirurgia" });

      expect(api.post).toHaveBeenCalledWith("/procedures", {
        name: "Nova Cirurgia",
      });
      expect(result.name).toBe("Nova Cirurgia");
    });
  });

  describe("update", () => {
    it("deve chamar PATCH /procedures/:id", async () => {
      (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "1", name: "Atualizado" },
      });

      const result = await procedureService.update("1", {
        name: "Atualizado",
      });

      expect(api.patch).toHaveBeenCalledWith("/procedures/1", {
        name: "Atualizado",
      });
      expect(result.name).toBe("Atualizado");
    });
  });

  describe("delete", () => {
    it("deve chamar DELETE /procedures/:id", async () => {
      (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await procedureService.delete("1");

      expect(api.delete).toHaveBeenCalledWith("/procedures/1");
    });
  });
});
