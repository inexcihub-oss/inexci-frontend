import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import { ReceivableStatus } from "@/types/finance.types";

vi.mock("@/services/finance.service", () => ({
  financeService: {
    listReceivables: vi.fn(),
    listPayments: vi.fn(),
    getReceivable: vi.fn(),
    listProfessionals: vi.fn(),
  },
}));
vi.mock("@/services/patient.service", () => ({
  patientService: { list: vi.fn().mockResolvedValue({ records: [] }) },
}));
vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: { getAvailableDoctors: vi.fn().mockResolvedValue([]) },
}));

import { financeService } from "@/services/finance.service";
import { ReceivablesTab } from "./ReceivablesTab";
import { PaymentsTab } from "./PaymentsTab";

const svc = vi.mocked(financeService);

describe("ReceivablesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    svc.getReceivable.mockReturnValue(new Promise(() => {}));
    svc.listProfessionals.mockResolvedValue([
      { id: "doc-1", name: "Dr. Carlos", council: "CRM", registry: "CRM 1/SP" },
      { id: "doc-2", name: "Dra. Sem Vínculo", council: "CRM", registry: "CRM 2/SP" },
    ]);
    svc.listReceivables.mockResolvedValue({
      data: [
        {
          id: "r-1",
          patient: { id: "p-1", name: "Ana Beatriz" },
          appointmentId: null,
          referenceDate: "2026-10-20",
          dueDate: null,
          totalAmount: "300.00",
          paidAmount: "100.00",
          balance: "200.00",
          status: ReceivableStatus.PARTIAL,
          description: "Consulta",
          createdAt: "2026-10-20T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalOpenAmount: "200.00",
    });
  });

  it("lista as cobranças com total em aberto, filtra por status e abre o drawer", async () => {
    renderWithProviders(<ReceivablesTab />);

    expect(await screen.findByText("Ana Beatriz")).toBeInTheDocument();
    expect(screen.getByTestId("total-em-aberto")).toHaveTextContent("R$ 200,00");

    await userEvent.selectOptions(screen.getByLabelText("Status"), "open");
    await waitFor(() =>
      expect(svc.listReceivables).toHaveBeenLastCalledWith({
        status: "open",
        page: 1,
        limit: 20,
      }),
    );

    await userEvent.click(screen.getByText("Ana Beatriz"));
    expect(svc.getReceivable).toHaveBeenCalledWith("r-1");
  });

  it("o filtro de profissional lista todos os profissionais da conta, não só os vinculados", async () => {
    renderWithProviders(<ReceivablesTab />);

    await screen.findByText("Ana Beatriz");
    const filtro = screen.getByLabelText("Profissional");
    await waitFor(() =>
      expect(
        Array.from((filtro as HTMLSelectElement).options).map((o) => o.textContent),
      ).toEqual(["Todos", "Dr. Carlos", "Dra. Sem Vínculo"]),
    );
  });

  it("no mobile os filtros ficam num botão que abre o modal, com a contagem dos ativos", async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    try {
      renderWithProviders(<ReceivablesTab />);

      await screen.findByText("Ana Beatriz");
      expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /Filtros/ }));
      const modal = await screen.findByRole("dialog");
      await userEvent.selectOptions(within(modal).getByLabelText("Status"), "open");
      await userEvent.click(within(modal).getByRole("button", { name: "Ver resultados" }));

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(screen.getByRole("button", { name: /Filtros/ })).toHaveTextContent("1");
      expect(svc.listReceivables).toHaveBeenLastCalledWith({
        status: "open",
        page: 1,
        limit: 20,
      });
    } finally {
      window.matchMedia = original;
    }
  });
});

describe("PaymentsTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra o total recebido e estornado do período", async () => {
    svc.listPayments.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalAmount: "1500.00",
      totalRefunded: "50.00",
    });
    renderWithProviders(<PaymentsTab />);

    await waitFor(() =>
      expect(screen.getByTestId("total-recebido")).toHaveTextContent(
        "R$ 1.500,00",
      ),
    );
    expect(screen.getByTestId("total-estornado")).toHaveTextContent("R$ 50,00");
    expect(svc.listPayments).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });
});
