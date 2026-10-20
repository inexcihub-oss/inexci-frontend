import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import { EditDateOptionsModal } from "./EditDateOptionsModal";
import {
  surgeryRequestService,
  type SurgeryRequestDetail,
} from "@/services/surgery-request.service";

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: { updateDateOptions: vi.fn(), notify: vi.fn() },
}));

const baseSolicitacao = {
  id: "sc-1",
  dateOptions: [],
  patient: { id: "p1", name: "Paciente" },
} as unknown as SurgeryRequestDetail;

function renderModal(solicitacao = baseSolicitacao) {
  const props = { onClose: vi.fn(), onSuccess: vi.fn() };
  renderWithProviders(
    <EditDateOptionsModal isOpen solicitacao={solicitacao} {...props} />,
  );
  return props;
}

describe("EditDateOptionsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(surgeryRequestService.updateDateOptions).mockResolvedValue(
      {} as never,
    );
    vi.mocked(surgeryRequestService.notify).mockResolvedValue({} as never);
  });

  it("renderiza como dialog com três campos de data rotulados", () => {
    renderModal();
    expect(
      screen.getByRole("dialog", { name: "Editar Datas" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Data 1/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data 2/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data 3/)).toBeInTheDocument();
  });

  it("exige ao menos uma data", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Salvar Datas" }));
    expect(
      await screen.findByText("Informe pelo menos 1 data."),
    ).toBeInTheDocument();
    expect(surgeryRequestService.updateDateOptions).not.toHaveBeenCalled();
  });

  it("salva direto quando o paciente não tem contato", async () => {
    const user = userEvent.setup();
    const { onSuccess } = renderModal();
    fireEvent.change(screen.getByLabelText(/Data 1/), {
      target: { value: "2026-11-05T09:30" },
    });
    await user.click(screen.getByRole("button", { name: "Salvar Datas" }));

    await waitFor(() =>
      expect(surgeryRequestService.updateDateOptions).toHaveBeenCalledWith(
        "sc-1",
        { dateOptions: [new Date("2026-11-05T09:30").toISOString()] },
      ),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("abre a confirmação de notificação por cima quando há contato", async () => {
    const user = userEvent.setup();
    renderModal({
      ...baseSolicitacao,
      patient: { id: "p1", name: "Paciente", phone: "11999999999" },
    } as unknown as SurgeryRequestDetail);
    fireEvent.change(screen.getByLabelText(/Data 1/), {
      target: { value: "2026-11-05T09:30" },
    });
    await user.click(screen.getByRole("button", { name: "Salvar Datas" }));

    expect(screen.getAllByRole("dialog")).toHaveLength(2);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(
      screen.getByRole("dialog", { name: "Editar Datas" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Salvar Datas" }));
    await user.click(
      screen.getByRole("button", { name: "Notificar paciente" }),
    );

    await waitFor(() =>
      expect(surgeryRequestService.updateDateOptions).toHaveBeenCalledWith(
        "sc-1",
        {
          dateOptions: [new Date("2026-11-05T09:30").toISOString()],
          notifyPatient: true,
        },
      ),
    );
  });

  it("fecha pelo botão Cancelar", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
