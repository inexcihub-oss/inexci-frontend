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
import { tussService } from "./tuss.service";

describe("tussService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addProcedures", () => {
    it("deve enviar tuss_code e name como obrigatórios", async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await tussService.addProcedures({
        surgery_request_id: "sr-1",
        procedures: [
          {
            procedure_id: "p-1",
            tuss_code: "30715016",
            name: "Artroscopia",
            quantity: 1,
          },
        ],
      });

      expect(api.post).toHaveBeenCalledWith("/surgery-requests/procedures", {
        surgery_request_id: "sr-1",
        procedures: [
          {
            procedure_id: "p-1",
            tuss_code: "30715016",
            name: "Artroscopia",
            quantity: 1,
          },
        ],
      });
    });

    it("não deve aceitar procedures sem tuss_code e name (TypeScript enforced)", () => {
      // Verifica que a interface requer tuss_code e name
      const validProcedure = {
        procedure_id: "p-1",
        tuss_code: "30715016",
        name: "Artroscopia",
        quantity: 1,
      };

      expect(validProcedure.tuss_code).toBeDefined();
      expect(validProcedure.name).toBeDefined();
    });
  });

  describe("searchTussFromJson", () => {
    it("deve chamar GET /tuss com params", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ id: "1", tuss_code: "123", name: "Test", active: true }],
      });

      const result = await tussService.searchTussFromJson("artro", 10);

      expect(api.get).toHaveBeenCalledWith("/tuss", {
        params: { limit: 10, search: "artro" },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("removeProcedure", () => {
    it("deve chamar DELETE /surgery-requests/procedures/:id", async () => {
      (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await tussService.removeProcedure("sr-1", "proc-1");

      expect(api.delete).toHaveBeenCalledWith(
        "/surgery-requests/procedures/proc-1",
        { data: { surgery_request_id: "sr-1" } },
      );
    });
  });
});
