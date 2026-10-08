import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const agenda = vi.hoisted(() => ({
  getAgenda: vi.fn(),
  getAgendaCompleta: vi.fn(),
}));
vi.mock("@/services/appointment.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/appointment.service")
  >("@/services/appointment.service");
  return { ...actual, appointmentService: agenda };
});
vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    getAgenda: vi.fn().mockResolvedValue({ total: 0, records: [] }),
  },
}));
const exportCsv = vi.hoisted(() => vi.fn());
vi.mock("@/lib/export-agenda", async () => {
  const actual = await vi.importActual<typeof import("@/lib/export-agenda")>(
    "@/lib/export-agenda",
  );
  return {
    ...actual,
    exportAgendaToCsv: exportCsv,
    exportAgendaToPdf: vi.fn(),
  };
});
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import { AgendaExportModal } from "./AgendaExportModal";

const consulta = (id: string) => ({
  id,
  doctorId: "d-1",
  patientId: `p-${id}`,
  patient: { id: `p-${id}`, name: `Paciente ${id}` },
  type: "first_visit" as const,
  status: "scheduled" as const,
  scheduledAt: new Date(2026, 9, 5, 9, 0).toISOString(),
  durationMinutes: 30,
  notes: null,
  cancellationReason: null,
  clinicId: null,
  isWalkIn: false,
});

function abrir() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <AgendaExportModal
        isOpen
        onClose={onClose}
        defaultFrom="2026-10-01"
        defaultTo="2026-10-31"
        canExportSurgeries={false}
      />
    </QueryClientProvider>,
  );
  return { onClose };
}

describe("AgendaExportModal — consultas além do teto da API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca a agenda completa (paginada) na prévia e na exportação", async () => {
    agenda.getAgendaCompleta.mockResolvedValue({
      total: 2,
      records: [consulta("a1"), consulta("a2")],
    });
    const { onClose } = abrir();

    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(agenda.getAgenda).not.toHaveBeenCalled();
    expect(screen.queryByText(/exportação sairá incompleta/)).toBeNull();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

    await waitFor(() => expect(exportCsv).toHaveBeenCalled());
    expect(exportCsv.mock.calls[0][0]).toHaveLength(2);
    expect(agenda.getAgenda).not.toHaveBeenCalled();
    expect(agenda.getAgendaCompleta).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalled();
  });

  it("avisa quando o período passa do que a paginação trouxe", async () => {
    agenda.getAgendaCompleta.mockResolvedValue({
      total: 25000,
      records: [consulta("a1")],
    });
    abrir();

    expect(
      await screen.findByText(
        /Mostrando 1 de 25000 consultas deste período: a exportação sairá incompleta/,
      ),
    ).toBeInTheDocument();
  });
});
