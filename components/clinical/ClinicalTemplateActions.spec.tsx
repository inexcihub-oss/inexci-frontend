import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/services/clinical-record-template.service", () => ({
  clinicalRecordTemplateService: {
    getAll: vi.fn(),
    create: vi.fn(),
    apply: vi.fn(),
    delete: vi.fn(),
  },
}));

const onboardingMockState = vi.hoisted(() => ({ emTour: false }));
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

import { clinicalRecordTemplateService } from "@/services/clinical-record-template.service";
import { ClinicalTemplateActions } from "./ClinicalTemplateActions";

const template = {
  id: "tpl-1",
  doctorId: "d-1",
  name: "Primeira consulta",
  specialty: "Ortopedia",
  anamnesis: "<p>Queixa principal:</p>",
  physicalExam: "<p>Exame:</p>",
  diagnosis: null,
  conduct: null,
  cidCodes: null,
  usageCount: 3,
  createdAt: "2026-07-30",
  updatedAt: "2026-07-30",
};

describe("ClinicalTemplateActions", () => {
  const onApply = vi.fn();
  const currentFields = {
    anamnesis: "",
    physicalExam: "",
    diagnosis: "",
    conduct: "",
    cidCodes: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    onboardingMockState.emTour = false;
    (
      clinicalRecordTemplateService.getAll as ReturnType<typeof vi.fn>
    ).mockResolvedValue([template]);
    (
      clinicalRecordTemplateService.apply as ReturnType<typeof vi.fn>
    ).mockResolvedValue(template);
    (
      clinicalRecordTemplateService.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue(template);
  });

  const setup = (fields = currentFields) =>
    render(
      <ClinicalTemplateActions
        doctorId="d-1"
        fields={fields as never}
        onApply={onApply}
      />,
    );

  it("carrega os modelos do médico da consulta", async () => {
    setup();

    await waitFor(() =>
      expect(clinicalRecordTemplateService.getAll).toHaveBeenCalledWith("d-1"),
    );
    expect(await screen.findByText("Primeira consulta")).toBeDefined();
  });

  it("aplica o modelo escolhido na ficha vazia sem perguntar nada", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByText("Primeira consulta"));

    await waitFor(() =>
      expect(clinicalRecordTemplateService.apply).toHaveBeenCalledWith("tpl-1"),
    );
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        anamnesis: "<p>Queixa principal:</p>",
        physicalExam: "<p>Exame:</p>",
      }),
    );
  });

  it("confirma antes de sobrescrever uma ficha já preenchida", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    setup({ ...currentFields, anamnesis: "<p>já escrito</p>" });

    await user.click(await screen.findByText("Primeira consulta"));

    expect(confirmSpy).toHaveBeenCalled();
    expect(clinicalRecordTemplateService.apply).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("salva a ficha atual como modelo novo", async () => {
    const user = userEvent.setup();
    setup({ ...currentFields, anamnesis: "<p>Dor lombar</p>" });

    await user.click(
      await screen.findByRole("button", { name: /salvar como modelo/i }),
    );
    await user.type(screen.getByLabelText(/nome do modelo/i), "Lombalgia");
    await user.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() =>
      expect(clinicalRecordTemplateService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Lombalgia",
          doctorId: "d-1",
          anamnesis: "<p>Dor lombar</p>",
        }),
      ),
    );
    // A lista recarrega para o modelo novo aparecer sem sair da tela.
    await waitFor(() =>
      expect(clinicalRecordTemplateService.getAll).toHaveBeenCalledTimes(2),
    );
  });

  it("não salva modelo sem nome", async () => {
    const user = userEvent.setup();
    setup({ ...currentFields, anamnesis: "<p>Dor lombar</p>" });

    await user.click(
      await screen.findByRole("button", { name: /salvar como modelo/i }),
    );
    await user.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(clinicalRecordTemplateService.create).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/nome/i);
  });

  it("não oferece salvar modelo a partir de uma ficha vazia", async () => {
    setup();

    expect(
      await screen.findByRole("button", { name: /salvar como modelo/i }),
    ).toBeDisabled();
  });

  it("some da tela quando o médico ainda não tem modelos", async () => {
    (
      clinicalRecordTemplateService.getAll as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);
    setup();

    await waitFor(() =>
      expect(clinicalRecordTemplateService.getAll).toHaveBeenCalled(),
    );
    expect(screen.queryByText(/aplicar modelo/i)).toBeNull();
  });

  /**
   * Aplicar um modelo chama `apply`, que incrementa o contador de uso real;
   * salvar cria um registro persistente. Nenhum dos dois pode acontecer com o
   * tour guiado no ar — a região dos modelos é destacada pelos passos
   * `indicacao`/`documentos` da trilha Atendimento.
   */
  it("mantém Aplicar e Salvar habilitados fora do tour", async () => {
    const user = userEvent.setup();
    setup({ ...currentFields, anamnesis: "<p>Dor lombar</p>" });

    expect(await screen.findByText("Primeira consulta")).toBeEnabled();

    await user.click(
      screen.getByRole("button", { name: /salvar como modelo/i }),
    );
    await user.type(screen.getByLabelText(/nome do modelo/i), "Lombalgia");
    expect(screen.getByRole("button", { name: /^salvar$/i })).toBeEnabled();
  });

  it("desabilita Aplicar e Salvar durante o tour", async () => {
    onboardingMockState.emTour = true;
    const user = userEvent.setup();
    setup({ ...currentFields, anamnesis: "<p>Dor lombar</p>" });

    expect(await screen.findByText("Primeira consulta")).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: /salvar como modelo/i }),
    );
    await user.type(screen.getByLabelText(/nome do modelo/i), "Lombalgia");
    expect(screen.getByRole("button", { name: /^salvar$/i })).toBeDisabled();
    expect(clinicalRecordTemplateService.create).not.toHaveBeenCalled();
  });
});
