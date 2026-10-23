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
import { clinicalRecordTemplateService } from "./clinical-record-template.service";

const template = {
  id: "tpl-1",
  doctorId: "d-1",
  name: "Primeira consulta",
  specialty: "Ortopedia",
  anamnesis: "<p>Queixa:</p>",
  physicalExam: null,
  diagnosis: null,
  conduct: null,
  cidCodes: null,
  usageCount: 3,
  createdAt: "2026-07-30",
  updatedAt: "2026-07-30",
};

describe("clinicalRecordTemplateService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista os modelos do próprio médico, sem escolher médico", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [template],
    });

    const result = await clinicalRecordTemplateService.getAll();

    expect(api.get).toHaveBeenCalledWith("/clinical-records/templates");
    expect(result).toHaveLength(1);
  });

  it("devolve array vazio quando a resposta não é uma lista", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });

    expect(await clinicalRecordTemplateService.getAll()).toEqual([]);
  });

  it("cria o modelo com os campos da ficha", async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: template,
    });

    await clinicalRecordTemplateService.create({
      name: "Primeira consulta",
      anamnesis: "<p>Queixa:</p>",
    });

    expect(api.post).toHaveBeenCalledWith("/clinical-records/templates", {
      name: "Primeira consulta",
      anamnesis: "<p>Queixa:</p>",
    });
  });

  it("aplica o modelo pelo endpoint que conta o uso", async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: template,
    });

    const applied = await clinicalRecordTemplateService.apply("tpl-1");

    expect(api.post).toHaveBeenCalledWith(
      "/clinical-records/templates/tpl-1/apply",
      {},
    );
    expect(applied.anamnesis).toBe("<p>Queixa:</p>");
  });

  it("exclui o modelo", async () => {
    await clinicalRecordTemplateService.delete("tpl-1");

    expect(api.delete).toHaveBeenCalledWith(
      "/clinical-records/templates/tpl-1",
    );
  });
});
