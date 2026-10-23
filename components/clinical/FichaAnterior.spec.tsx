import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import type { ClinicalRecord } from "@/services/clinical-record.service";

vi.mock("@/services/clinical-record.service", () => ({
  clinicalRecordService: { getByPatient: vi.fn() },
}));

import { clinicalRecordService } from "@/services/clinical-record.service";
import {
  anexarHtml,
  escolherFichaAnterior,
  FichaAnterior,
} from "./FichaAnterior";

function ficha(over: Partial<ClinicalRecord>): ClinicalRecord {
  return {
    id: "r",
    doctorId: "d-1",
    patientId: "p-1",
    appointmentId: "a-x",
    anamnesis: null,
    physicalExam: null,
    diagnosis: null,
    cidCodes: [],
    conduct: null,
    surgicalIndication: false,
    surgeryRequestId: null,
    procedureId: null,
    procedure: null,
    finalizedAt: null,
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z",
    ...over,
  };
}

describe("escolherFichaAnterior", () => {
  it("pega a última finalizada que não é a consulta atual", () => {
    const fichas = [
      ficha({ id: "atual", appointmentId: "a-1" }),
      ficha({ id: "rascunho-velho", appointmentId: "a-0" }),
      ficha({ id: "antiga", finalizedAt: "2026-08-01T12:00:00.000Z" }),
      ficha({ id: "recente", finalizedAt: "2026-09-20T12:00:00.000Z" }),
      ficha({
        id: "mesma-consulta",
        appointmentId: "a-1",
        finalizedAt: "2026-10-01T12:00:00.000Z",
      }),
    ];

    expect(escolherFichaAnterior(fichas, "a-1", "atual")?.id).toBe("recente");
    expect(escolherFichaAnterior([], "a-1", null)).toBeNull();
  });
});

describe("anexarHtml", () => {
  it("acrescenta ao fim sem apagar o que já foi escrito", () => {
    expect(anexarHtml("", "<p>Novo</p>")).toBe("<p>Novo</p>");
    expect(anexarHtml("<p></p>", "<p>Novo</p>")).toBe("<p>Novo</p>");
    expect(anexarHtml("<p>Atual</p>", "<p>Novo</p>")).toBe(
      "<p>Atual</p><p>Novo</p>",
    );
  });
});

describe("FichaAnterior", () => {
  it("mostra só as seções preenchidas e copia a escolhida", async () => {
    const user = userEvent.setup();
    vi.mocked(clinicalRecordService.getByPatient).mockResolvedValue([
      ficha({
        id: "recente",
        finalizedAt: "2026-09-20T12:00:00.000Z",
        anamnesis: "<p>Dor no joelho</p>",
        conduct: "<p>Fisioterapia</p>",
        cidCodes: [{ code: "M23.2", description: "Menisco" }],
      }),
    ]);
    const onCopiar = vi.fn();
    const onCopiarCids = vi.fn();
    renderWithProviders(
      <FichaAnterior
        patientId="p-1"
        appointmentId="a-1"
        currentRecordId={null}
        onCopiar={onCopiar}
        onCopiarCids={onCopiarCids}
      />,
    );

    expect(await screen.findByText("Dor no joelho")).toBeInTheDocument();
    expect(screen.getByText("20/09/2026")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Copiar Exame físico/ }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Copiar Conduta / Plano para esta consulta",
      }),
    );
    expect(onCopiar).toHaveBeenCalledWith("conduct", "<p>Fisioterapia</p>");

    await user.click(
      screen.getByRole("button", { name: "Copiar CID-10 para esta consulta" }),
    );
    expect(onCopiarCids).toHaveBeenCalledWith([
      { code: "M23.2", description: "Menisco" },
    ]);
  });

  it("avisa quando não há atendimento finalizado antes", async () => {
    vi.mocked(clinicalRecordService.getByPatient).mockResolvedValue([]);
    renderWithProviders(
      <FichaAnterior
        patientId="p-1"
        appointmentId="a-1"
        currentRecordId={null}
        onCopiar={vi.fn()}
        onCopiarCids={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("Nenhum atendimento finalizado antes deste."),
    ).toBeInTheDocument();
  });
});
