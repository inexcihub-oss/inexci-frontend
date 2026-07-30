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
import { clinicalRecordService } from "./clinical-record.service";

const record = {
  id: "cr1",
  doctorId: "d1",
  patientId: "p1",
  appointmentId: "a1",
  anamnesis: "<p>x</p>",
  physicalExam: null,
  diagnosis: null,
  cidCodes: [{ code: "M54", description: "Dorsalgia" }],
  conduct: null,
  finalizedAt: null,
  createdAt: "2026-08-01",
  updatedAt: "2026-08-01",
};

describe("clinicalRecordService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getByPatient envia patientId e retorna array", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [record] });
    const result = await clinicalRecordService.getByPatient("p1");
    expect(api.get).toHaveBeenCalledWith("/clinical-records", {
      params: { patientId: "p1" },
    });
    expect(result).toHaveLength(1);
  });

  it("getByAppointment devolve null quando não há ficha", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });
    const result = await clinicalRecordService.getByAppointment("a1");
    expect(result).toBeNull();
  });

  it("finalize faz POST no endpoint de finalização", async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ...record, finalizedAt: "2026-08-02" },
    });
    const result = await clinicalRecordService.finalize("cr1");
    expect(api.post).toHaveBeenCalledWith("/clinical-records/cr1/finalize", {});
    expect(result.finalizedAt).toBe("2026-08-02");
  });
});
