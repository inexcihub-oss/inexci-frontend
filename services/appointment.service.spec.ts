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
import { appointmentService, rotuloDoAtendimento } from "./appointment.service";

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

  describe("getAgendaCompleta", () => {
    const pagina = (n: number, prefixo: string) =>
      Array.from({ length: n }, (_, i) => ({
        ...mockAppt,
        id: `${prefixo}${i}`,
      }));

    it("busca todas as páginas até alcançar o total", async () => {
      const get = api.get as ReturnType<typeof vi.fn>;
      get
        .mockResolvedValueOnce({
          data: { total: 2500, records: pagina(1000, "a") },
        })
        .mockResolvedValueOnce({
          data: { total: 2500, records: pagina(1000, "b") },
        })
        .mockResolvedValueOnce({
          data: { total: 2500, records: pagina(500, "c") },
        });

      const result = await appointmentService.getAgendaCompleta({
        from: "2026-08-01",
        to: "2026-08-31",
      });

      expect(result.records).toHaveLength(2500);
      expect(result.total).toBe(2500);
      expect(get).toHaveBeenCalledTimes(3);
      expect(get).toHaveBeenNthCalledWith(1, "/appointments", {
        params: { from: "2026-08-01", to: "2026-08-31", take: "1000" },
      });
      expect(get).toHaveBeenNthCalledWith(3, "/appointments", {
        params: {
          from: "2026-08-01",
          to: "2026-08-31",
          skip: "2000",
          take: "1000",
        },
      });
    });

    it("uma página só quando o total cabe nela", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { total: 1, records: [mockAppt] },
      });

      const result = await appointmentService.getAgendaCompleta();

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(result.records).toHaveLength(1);
    });

    it("página vazia antes do total encerra a busca, preservando o total real", async () => {
      const get = api.get as ReturnType<typeof vi.fn>;
      get
        .mockResolvedValueOnce({
          data: { total: 1500, records: pagina(1000, "a") },
        })
        .mockResolvedValueOnce({ data: { total: 1500, records: [] } });

      const result = await appointmentService.getAgendaCompleta();

      expect(get).toHaveBeenCalledTimes(2);
      expect(result.records).toHaveLength(1000);
      expect(result.total).toBe(1500);
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

  it("getAgenda preserva a situação da ficha e não a inventa quando ausente", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        total: 3,
        records: [
          { ...mockAppt, id: "a1", clinicalRecordStatus: "draft" },
          { ...mockAppt, id: "a2", clinicalRecordStatus: null },
          { ...mockAppt, id: "a3" },
        ],
      },
    });

    const [rascunho, semFicha, semInfo] = await appointmentService.getAgenda({
      from: "2026-08-01",
      to: "2026-08-31",
    });

    expect(rascunho.clinicalRecordStatus).toBe("draft");
    expect(semFicha.clinicalRecordStatus).toBeNull();
    expect(semInfo).not.toHaveProperty("clinicalRecordStatus");
  });
});

describe("rotuloDoAtendimento", () => {
  it.each([
    ["completed", undefined, "Ver atendimento"],
    ["confirmed", "finalized", "Ver atendimento"],
    ["confirmed", "draft", "Continuar atendimento"],
    ["in_progress", null, "Iniciar atendimento"],
    ["scheduled", null, "Iniciar atendimento"],
    ["in_progress", undefined, "Continuar atendimento"],
    ["waiting", undefined, "Iniciar atendimento"],
  ] as const)("%s + ficha %s → %s", (status, ficha, esperado) => {
    expect(rotuloDoAtendimento({ status, clinicalRecordStatus: ficha })).toBe(
      esperado,
    );
  });
});
