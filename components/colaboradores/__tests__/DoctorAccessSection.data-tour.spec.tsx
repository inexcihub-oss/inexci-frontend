import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DoctorAccessSection } from "../DoctorAccessSection";

vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: {
    getDoctorsForAccount: vi.fn().mockResolvedValue([
      { id: "doc-1", name: "Dra. Exemplo", crm: "12345", crmState: "SP" },
    ]),
  },
}));

vi.mock("@/services/user-doctor-access.service", () => ({
  userDoctorAccessService: {
    getAccessForUser: vi.fn().mockResolvedValue([]),
    setAccessForUser: vi.fn(),
  },
}));

describe("DoctorAccessSection — âncora do tour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('expõe data-tour="colaborador-vinculo-medico"', async () => {
    render(
      <DoctorAccessSection
        collaboratorId="col-1"
        collaboratorIsDoctor={false}
        collaboratorName="Colaborador de teste"
      />,
    );

    await screen.findByPlaceholderText("Buscar médico...");
    expect(
      document.querySelector('[data-tour="colaborador-vinculo-medico"]'),
    ).not.toBeNull();
  });

  it('desabilita "Salvar acessos" para o colaborador fabricado do tour', async () => {
    const { userDoctorAccessService } = await import(
      "@/services/user-doctor-access.service"
    );
    render(
      <DoctorAccessSection
        collaboratorId="tour-demo-colaborador"
        collaboratorIsDoctor={false}
        collaboratorName="Colaborador de demonstração"
      />,
    );

    await screen.findByPlaceholderText("Buscar médico...");
    expect(userDoctorAccessService.getAccessForUser).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Salvar acessos" }),
    ).toBeDisabled();
  });

  it("handleSave não chama userDoctorAccessService.setAccessForUser para o colaborador fabricado, mesmo com o botão nativamente habilitado", async () => {
    const { userDoctorAccessService } = await import(
      "@/services/user-doctor-access.service"
    );
    render(
      <DoctorAccessSection
        collaboratorId="tour-demo-colaborador"
        collaboratorIsDoctor={false}
        collaboratorName="Colaborador de demonstração"
      />,
    );

    await screen.findByPlaceholderText("Buscar médico...");

    const saveButton = screen.getByRole("button", {
      name: "Salvar acessos",
    }) as HTMLButtonElement;
    saveButton.disabled = false;
    fireEvent.click(saveButton);

    expect(userDoctorAccessService.setAccessForUser).not.toHaveBeenCalled();
  });
});
