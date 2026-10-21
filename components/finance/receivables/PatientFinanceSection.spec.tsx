import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import { ReceivableStatus } from "@/types/finance.types";

vi.mock("@/services/finance.service", () => ({
  financeService: { getPatientSummary: vi.fn(), getReceivable: vi.fn() },
}));
vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: { getAvailableDoctors: vi.fn().mockResolvedValue([]) },
}));

import { financeService } from "@/services/finance.service";
import { PatientFinanceSection } from "./PatientFinanceSection";

const svc = vi.mocked(financeService);

const item = (id: string, status: ReceivableStatus, total: string) => ({
  id,
  patient: { id: "p-1", name: "Ana" },
  appointmentId: null,
  referenceDate: "2026-10-01",
  dueDate: null,
  totalAmount: total,
  paidAmount: "0.00",
  balance: total,
  status,
  description: `Cobrança ${id}`,
  createdAt: "2026-10-01T00:00:00.000Z",
});

describe("PatientFinanceSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra o total em aberto e o histórico de cobranças", async () => {
    svc.getPatientSummary.mockResolvedValue({
      openAmount: "450.00",
      receivables: [
        item("r-1", ReceivableStatus.OPEN, "450.00"),
        item("r-2", ReceivableStatus.PAID, "300.00"),
      ],
    });
    svc.getReceivable.mockReturnValue(new Promise(() => {}));
    renderWithProviders(
      <PatientFinanceSection patient={{ id: "p-1", name: "Ana" }} />,
    );

    expect(await screen.findByText("Cobrança r-1")).toBeInTheDocument();
    expect(svc.getPatientSummary).toHaveBeenCalledWith("p-1");
    expect(screen.getByTestId("paciente-em-aberto")).toHaveTextContent(
      "R$ 450,00",
    );
    expect(screen.getByText("Em aberto", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Pago")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Cobrança r-2"));
    expect(svc.getReceivable).toHaveBeenCalledWith("r-2");
  });

  it("sem cobranças mostra o vazio", async () => {
    svc.getPatientSummary.mockResolvedValue({ openAmount: "0.00", receivables: [] });
    renderWithProviders(
      <PatientFinanceSection patient={{ id: "p-1", name: "Ana" }} />,
    );
    expect(
      await screen.findByText("Nenhuma cobrança para este paciente."),
    ).toBeInTheDocument();
  });
});
