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
import { appointmentService } from "./appointment.service";

const mockAppt = {
  id: "a1",
  doctorId: "d1",
  patientId: "p1",
  type: "return",
  status: "scheduled",
  scheduledAt: "2026-08-01T14:00:00.000Z",
  durationMinutes: 30,
  notes: null,
  cancellationReason: null,
  patient: { id: "p1", name: "Ana" },
};

describe("appointmentService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getAgenda", () => {
    it("envia from/to/doctorId e mapeia os registros", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { total: 1, records: [mockAppt] },
      });

      const result = await appointmentService.getAgenda({
        from: "2026-08-01",
        to: "2026-08-31",
        doctorId: "d1",
      });

      expect(api.get).toHaveBeenCalledWith("/appointments", {
        params: { from: "2026-08-01", to: "2026-08-31", doctorId: "d1" },
      });
      expect(result).toHaveLength(1);
      expect(result[0].patient?.name).toBe("Ana");
      expect(result[0].type).toBe("return");
    });

    it("omite doctorId quando não informado", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [mockAppt],
      });

      await appointmentService.getAgenda({
        from: "2026-08-01",
        to: "2026-08-31",
      });

      expect(api.get).toHaveBeenCalledWith("/appointments", {
        params: { from: "2026-08-01", to: "2026-08-31" },
      });
    });

    it("envia status como lista separada por vírgula e a ordem", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

      await appointmentService.getAgenda({
        status: ["scheduled", "confirmed"],
        order: "DESC",
      });

      expect(api.get).toHaveBeenCalledWith("/appointments", {
        params: { status: "scheduled,confirmed", order: "DESC" },
      });
    });

    it("omite from/to quando a janela é aberta (lista sem limite de data)", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

      await appointmentService.getAgenda({ status: ["completed"] });

      expect(api.get).toHaveBeenCalledWith("/appointments", {
        params: { status: "completed" },
      });
    });
  });

  // D-15: o backend corta a lista num teto e `total` é a contagem real. A
  // desigualdade `total > records.length` é o único sinal de corte.
  describe("getAgendaPage", () => {
    it("expõe o total do servidor junto dos registros", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { total: 1103, records: [mockAppt] },
      });

      const result = await appointmentService.getAgendaPage({
        status: ["completed"],
        order: "DESC",
      });

      expect(result.total).toBe(1103);
      expect(result.records).toHaveLength(1);
      expect(result.total).toBeGreaterThan(result.records.length);
    });

    it("sem `total` na resposta, cai para o número de registros (nenhum aviso falso)", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [mockAppt],
      });

      const result = await appointmentService.getAgendaPage();

      expect(result.total).toBe(1);
      expect(result.records).toHaveLength(1);
    });
  });

  describe("getByPatient", () => {
    it("busca o histórico do paciente e mapeia os registros", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { total: 1, records: [mockAppt] },
      });

      const result = await appointmentService.getByPatient("p1");

      expect(api.get).toHaveBeenCalledWith("/appointments/patient/p1");
      expect(result).toHaveLength(1);
      expect(result[0].patientId).toBe("p1");
    });
  });

  describe("updateStatus", () => {
    it("inclui cancellationReason ao cancelar", async () => {
      (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...mockAppt, status: "cancelled" },
      });

      await appointmentService.updateStatus("a1", "cancelled", "paciente");

      expect(api.patch).toHaveBeenCalledWith("/appointments/a1/status", {
        status: "cancelled",
        cancellationReason: "paciente",
      });
    });

    it("omite cancellationReason nos demais status", async () => {
      (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...mockAppt, status: "confirmed" },
      });

      await appointmentService.updateStatus("a1", "confirmed");

      expect(api.patch).toHaveBeenCalledWith("/appointments/a1/status", {
        status: "confirmed",
      });
    });
  });
});
