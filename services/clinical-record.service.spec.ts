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

  describe("documentos emitidos no atendimento", () => {
    const generated = {
      id: "doc1",
      name: "Receita — 30/07/2026",
      key: "prescription",
      type: "prescription",
      uri: "https://r2/receita.pdf",
      createdAt: "2026-07-30",
    };

    it("generatePrescription envia a ficha e os medicamentos", async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: generated,
      });

      const result = await clinicalRecordService.generatePrescription({
        clinicalRecordId: "cr1",
        items: [{ name: "Dipirona 500mg", instructions: "1 cp 6/6h" }],
      });

      expect(api.post).toHaveBeenCalledWith(
        "/clinical-records/documents/prescription",
        {
          clinicalRecordId: "cr1",
          items: [{ name: "Dipirona 500mg", instructions: "1 cp 6/6h" }],
        },
      );
      expect(result.uri).toBe("https://r2/receita.pdf");
    });

    it("generateMedicalCertificate envia os dias de afastamento", async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...generated, key: "medical_certificate" },
      });

      await clinicalRecordService.generateMedicalCertificate({
        clinicalRecordId: "cr1",
        restDays: 3,
        includeCid: true,
      });

      expect(api.post).toHaveBeenCalledWith(
        "/clinical-records/documents/medical-certificate",
        { clinicalRecordId: "cr1", restDays: 3, includeCid: true },
      );
    });

    it("previewDocument devolve o HTML do documento sem emitir", async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { html: "<html>previa</html>" },
      });

      const html = await clinicalRecordService.previewDocument("prescription", {
        clinicalRecordId: "cr1",
        items: [{ name: "Dipirona 500mg" }],
      });

      expect(api.post).toHaveBeenCalledWith(
        "/clinical-records/documents/prescription/preview",
        { clinicalRecordId: "cr1", items: [{ name: "Dipirona 500mg" }] },
      );
      expect(html).toBe("<html>previa</html>");
    });

    it("previewDocument usa o endpoint de cada tipo de documento", async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { html: "<html>previa</html>" },
      });

      await clinicalRecordService.previewDocument("medical-certificate", {
        clinicalRecordId: "cr1",
        restDays: 2,
      });
      expect(api.post).toHaveBeenLastCalledWith(
        "/clinical-records/documents/medical-certificate/preview",
        expect.anything(),
      );

      await clinicalRecordService.previewDocument("exam-referral", {
        clinicalRecordId: "cr1",
        exams: [{ name: "Hemograma" }],
      });
      expect(api.post).toHaveBeenLastCalledWith(
        "/clinical-records/documents/exam-referral/preview",
        expect.anything(),
      );
    });

    it("generateExamReferral envia os exames solicitados", async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...generated, key: "exam_referral" },
      });

      await clinicalRecordService.generateExamReferral({
        clinicalRecordId: "cr1",
        exams: [{ name: "Hemograma completo" }],
        clinicalIndication: "Anemia a esclarecer",
      });

      expect(api.post).toHaveBeenCalledWith(
        "/clinical-records/documents/exam-referral",
        {
          clinicalRecordId: "cr1",
          exams: [{ name: "Hemograma completo" }],
          clinicalIndication: "Anemia a esclarecer",
        },
      );
    });
  });
});
