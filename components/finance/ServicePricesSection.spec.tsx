import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import type { ServicePriceDto } from "@/types/finance.types";

vi.mock("@/services/finance.service", () => ({
  financeService: {
    listServicePrices: vi.fn(),
    createServicePrice: vi.fn(),
    updateServicePrice: vi.fn(),
    deleteServicePrice: vi.fn(),
  },
}));

vi.mock("@/hooks/useFinanceProfessionals", () => ({
  useFinanceProfessionals: () => ({
    data: [
      { id: "doc-1", name: "Dr. Fabio" },
      { id: "doc-2", name: "Dra. Ana" },
    ],
  }),
}));

import { financeService } from "@/services/finance.service";
import { ServicePricesSection } from "./ServicePricesSection";

const svc = financeService as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

const precos: ServicePriceDto[] = [
  {
    id: "sp-1",
    doctorId: "doc-1",
    doctor: { id: "doc-1", name: "Dr. Fabio" },
    appointmentType: "first_visit",
    description: "Consulta ortopédica",
    amount: "300.00",
    active: true,
  },
  {
    id: "sp-2",
    doctorId: null,
    doctor: null,
    appointmentType: null,
    description: "Consulta padrão",
    amount: "250.50",
    active: false,
  },
];

describe("ServicePricesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    svc.listServicePrices.mockResolvedValue(precos);
  });

  it("lista profissional, tipo, descrição, valor e situação", async () => {
    renderWithProviders(<ServicePricesSection />);

    expect(await screen.findByText("Consulta ortopédica")).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Fabio · Primeira consulta/)).toBeInTheDocument();
    expect(
      screen.getByText(/Todos os profissionais · Todos os tipos/),
    ).toBeInTheDocument();
    expect(screen.getByText(/R\$\s300,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s250,50/)).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("Inativo")).toBeInTheDocument();
  });

  it("mostra o estado vazio", async () => {
    svc.listServicePrices.mockResolvedValue([]);
    renderWithProviders(<ServicePricesSection />);

    expect(
      await screen.findByText(/Nenhum preço cadastrado/),
    ).toBeInTheDocument();
  });

  it("cria um preço com o valor em string decimal", async () => {
    svc.createServicePrice.mockResolvedValue({ ...precos[0], id: "sp-3" });
    renderWithProviders(<ServicePricesSection />);
    await screen.findByText("Consulta ortopédica");

    await userEvent.click(screen.getByRole("button", { name: /Novo preço/ }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.selectOptions(
      within(dialog).getByLabelText("Profissional"),
      "doc-2",
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText("Tipo de consulta"),
      "return",
    );
    await userEvent.type(within(dialog).getByLabelText(/Descrição/), "Retorno");
    await userEvent.type(within(dialog).getByLabelText(/Valor/), "15000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(svc.createServicePrice).toHaveBeenCalledWith({
        doctorId: "doc-2",
        appointmentType: "return",
        description: "Retorno",
        amount: "150.00",
        active: true,
      }),
    );
    expect(await screen.findByText("Preço cadastrado.")).toBeInTheDocument();
  });

  it("usa null para 'Todos' e não envia sem valor", async () => {
    renderWithProviders(<ServicePricesSection />);
    await screen.findByText("Consulta ortopédica");

    await userEvent.click(screen.getByRole("button", { name: /Novo preço/ }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/Descrição/), "Geral");
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    expect(
      await within(dialog).findByText("Informe um valor maior que zero."),
    ).toBeInTheDocument();
    expect(svc.createServicePrice).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/Valor/), "9990");
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(svc.createServicePrice).toHaveBeenCalledWith({
        doctorId: null,
        appointmentType: null,
        description: "Geral",
        amount: "99.90",
        active: true,
      }),
    );
  });

  it("edita um preço existente já preenchido", async () => {
    svc.updateServicePrice.mockResolvedValue(precos[0]);
    renderWithProviders(<ServicePricesSection />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Editar Consulta ortopédica" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/Valor/)).toHaveValue("R$ 300,00");
    await userEvent.click(within(dialog).getByLabelText("Ativo"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(svc.updateServicePrice).toHaveBeenCalledWith("sp-1", {
        doctorId: "doc-1",
        appointmentType: "first_visit",
        description: "Consulta ortopédica",
        amount: "300.00",
        active: false,
      }),
    );
    expect(await screen.findByText("Preço atualizado.")).toBeInTheDocument();
  });

  it("exclui após confirmar", async () => {
    svc.deleteServicePrice.mockResolvedValue(undefined);
    renderWithProviders(<ServicePricesSection />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Excluir Consulta padrão" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Consulta padrão/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(svc.deleteServicePrice).toHaveBeenCalledWith("sp-2"),
    );
    expect(await screen.findByText("Preço excluído.")).toBeInTheDocument();
  });
});
