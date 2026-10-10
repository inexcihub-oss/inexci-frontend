import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import { SurgeryStatusModal } from "./SurgeryStatusModal";
import {
  surgeryRequestService,
  type SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { documentService } from "@/services/document.service";

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    markPerformed: vi.fn(),
    reschedule: vi.fn(),
    close: vi.fn(),
  },
}));

vi.mock("@/services/document.service", () => ({
  documentService: { upload: vi.fn() },
  DOCUMENT_FOLDERS: { POST_SURGERY: "post" },
}));

const solicitacao = {
  id: "sc-1",
  surgeryDate: "2026-10-20T10:00:00.000Z",
} as unknown as SurgeryRequestDetail;

function renderModal(
  overrides: Partial<{ onClose: () => void; onSuccess: () => void }> = {},
) {
  const props = { onClose: vi.fn(), onSuccess: vi.fn(), ...overrides };
  renderWithProviders(
    <SurgeryStatusModal isOpen solicitacao={solicitacao} {...props} />,
  );
  return props;
}

describe("SurgeryStatusModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(surgeryRequestService.markPerformed).mockResolvedValue(
      {} as never,
    );
    vi.mocked(surgeryRequestService.reschedule).mockResolvedValue({} as never);
    vi.mocked(surgeryRequestService.close).mockResolvedValue({} as never);
    vi.mocked(documentService.upload).mockResolvedValue({} as never);
  });

  it("renderiza como dialog com o título da etapa", () => {
    renderModal();
    expect(
      screen.getByRole("dialog", { name: "Status da cirurgia" }),
    ).toBeInTheDocument();
  });

  it("não avança sem escolher o status", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    expect(
      await screen.findByText("Selecione o status da cirurgia."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Qual o status atual da cirurgia?"),
    ).toBeInTheDocument();
  });

  it("marca como realizada com a data agendada", async () => {
    const user = userEvent.setup();
    const { onSuccess, onClose } = renderModal();
    await user.click(screen.getByRole("button", { name: "Realizada" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));

    expect(
      screen.getByRole("dialog", { name: "Cirurgia realizada" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Descrição cirúrgica (Folha de sala)"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    await waitFor(() =>
      expect(surgeryRequestService.markPerformed).toHaveBeenCalledWith("sc-1", {
        surgeryPerformedAt: "2026-10-20T10:00:00.000Z",
      }),
    );
    expect(onClose).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it("envia os anexos antes de marcar como realizada", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Realizada" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));

    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["x"], "folha.pdf", { type: "application/pdf" });
    await user.upload(input, file);
    expect(screen.getByText("folha.pdf")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    await waitFor(() =>
      expect(documentService.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          surgeryRequestId: "sc-1",
          key: "surgery_room",
          name: "Descrição cirúrgica (Folha de sala).pdf",
        }),
      ),
    );
    await waitFor(() =>
      expect(surgeryRequestService.markPerformed).toHaveBeenCalled(),
    );
  });

  it("exige a nova data para reagendar", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Reagendada" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(
      await screen.findByText("Selecione a nova data da cirurgia."),
    ).toBeInTheDocument();
    expect(surgeryRequestService.reschedule).not.toHaveBeenCalled();
  });

  it("reagenda com a data e horário informados", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Reagendada" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));

    const dateInput =
      document.querySelector<HTMLInputElement>('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: "2026-11-05" } });
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(surgeryRequestService.reschedule).toHaveBeenCalledWith("sc-1", {
        newDate: new Date("2026-11-05T10:00:00").toISOString(),
      }),
    );
  });

  it("encerra a solicitação quando cancelada", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Cancelada" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.click(screen.getByRole("button", { name: "Encerrar" }));

    await waitFor(() =>
      expect(surgeryRequestService.close).toHaveBeenCalledWith("sc-1", {
        reason: "Cirurgia cancelada",
      }),
    );
  });

  it("fecha com Esc e volta para a primeira etapa ao reabrir", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole("button", { name: "Cancelada" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Status da cirurgia" }),
    ).toBeInTheDocument();
  });

  it("não fecha durante o envio", async () => {
    let resolveClose: (value: unknown) => void = () => {};
    vi.mocked(surgeryRequestService.close).mockReturnValue(
      new Promise((resolve) => {
        resolveClose = resolve;
      }) as never,
    );
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole("button", { name: "Cancelada" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.click(screen.getByRole("button", { name: "Encerrar" }));

    expect(await screen.findByText("Encerrando...")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Fechar" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();

    resolveClose({});
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
