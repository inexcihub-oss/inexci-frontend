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
import { surgeryRequestService } from "./surgery-request.service";

describe("surgeryRequestService — getKanban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chama o endpoint enxuto /surgery-requests/kanban sem round-trip extra", async () => {
    const payload = {
      total: 1,
      records: [{ id: 1, status: 1, pendenciesCount: 2 }],
    };
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: payload });

    const result = await surgeryRequestService.getKanban();

    expect(api.get).toHaveBeenCalledWith("/surgery-requests/kanban");
    expect(result.records[0].pendenciesCount).toBe(2);
  });

  it("getAgenda consulta /surgery-requests/agenda por intervalo de data", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { total: 0, records: [] },
    });

    await surgeryRequestService.getAgenda(
      "2026-07-01T00:00:00.000Z",
      "2026-07-31T23:59:59.999Z",
    );

    expect(api.get).toHaveBeenCalledWith("/surgery-requests/agenda", {
      params: {
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-31T23:59:59.999Z",
      },
    });
  });
});

describe("surgeryRequestService — PDF downloads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("downloadContestAuthorizationPdf", () => {
    it("deve chamar GET /surgery-requests/:id/contest-authorization-pdf", async () => {
      const mockData = new ArrayBuffer(8);
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
      });

      const result =
        await surgeryRequestService.downloadContestAuthorizationPdf("456");

      expect(api.get).toHaveBeenCalledWith(
        "/surgery-requests/456/contest-authorization-pdf",
        { responseType: "arraybuffer" },
      );
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("application/pdf");
    });
  });
});

describe("surgeryRequestService.getAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envia apenas o take quando não há filtro", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { total: 0, records: [] },
    });

    await surgeryRequestService.getAll();

    expect(api.get).toHaveBeenCalledWith("/surgery-requests", {
      params: { take: 1000 },
    });
  });

  it("envia patientId junto com o take quando filtrado", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { total: 1, records: [{ id: "sr-1" }] },
    });

    const result = await surgeryRequestService.getAll({ patientId: "p-1" });

    expect(api.get).toHaveBeenCalledWith("/surgery-requests", {
      params: { take: 1000, patientId: "p-1" },
    });
    expect(result.records).toHaveLength(1);
  });

  it("não envia a chave patientId quando o valor é undefined", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { total: 0, records: [] },
    });

    await surgeryRequestService.getAll({ patientId: undefined });

    expect(api.get).toHaveBeenCalledWith("/surgery-requests", {
      params: { take: 1000 },
    });
  });

  it("envia hospitalId, healthPlanId e doctorId quando informados", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { total: 0, records: [] },
    });

    await surgeryRequestService.getAll({
      hospitalId: "h-1",
      healthPlanId: "hp-1",
      doctorId: "d-1",
    });

    expect(api.get).toHaveBeenCalledWith("/surgery-requests", {
      params: {
        take: 1000,
        hospitalId: "h-1",
        healthPlanId: "hp-1",
        doctorId: "d-1",
      },
    });
  });

  it("omite as chaves dos filtros ausentes", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { total: 0, records: [] },
    });

    await surgeryRequestService.getAll({ hospitalId: "h-1" });

    expect(api.get).toHaveBeenCalledWith("/surgery-requests", {
      params: { take: 1000, hospitalId: "h-1" },
    });
  });
});
