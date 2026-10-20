import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import { UpdateAuthorizationsModal } from "./UpdateAuthorizationsModal";
import {
  surgeryRequestService,
  type SurgeryRequestDetail,
} from "@/services/surgery-request.service";

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    authorizeQuantities: vi.fn(),
    acceptAuthorization: vi.fn(),
    notify: vi.fn(),
    close: vi.fn(),
    contestAuthorization: vi.fn(),
  },
}));

vi.mock("@/services/document.service", () => ({
  documentService: { upload: vi.fn() },
  DOCUMENT_FOLDERS: {},
}));

const solicitacao = {
  id: "sc-1",
  patient: { id: "p1", name: "Paciente" },
  tussItems: [
    { id: "t1", tussCode: "30715016", name: "Artroscopia", quantity: 1 },
  ],
  opmeItems: [],
} as unknown as SurgeryRequestDetail;

function renderModal() {
  const props = { onClose: vi.fn(), onSuccess: vi.fn() };
  renderWithProviders(
    <UpdateAuthorizationsModal isOpen solicitacao={solicitacao} {...props} />,
  );
  return props;
}

async function irParaAgendamento(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Próximo" }));
  await user.click(screen.getByRole("button", { name: "Próximo" }));
  await user.click(screen.getByRole("button", { name: "Aceitar" }));
}

describe("UpdateAuthorizationsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(surgeryRequestService.authorizeQuantities).mockResolvedValue(
      {} as never,
    );
    vi.mocked(surgeryRequestService.acceptAuthorization).mockResolvedValue(
      {} as never,
    );
  });

  it("troca o título do dialog a cada etapa", async () => {
    const user = userEvent.setup();
    renderModal();
    expect(
      screen.getByRole("dialog", { name: "Autorizações" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    expect(
      screen.getByText("Nenhum item OPME nesta solicitação."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    expect(
      screen.getByRole("dialog", { name: "Autorizações - Resumo" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceitar" }));
    expect(
      screen.getByRole("dialog", { name: "Agendamento" }),
    ).toBeInTheDocument();
  });

  it("bloqueia opção de data com horário faltando", async () => {
    const user = userEvent.setup();
    renderModal();
    await irParaAgendamento(user);

    fireEvent.change(document.querySelector('input[type="date"]')!, {
      target: { value: "2026-11-05" },
    });
    await user.click(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    );

    expect(
      await screen.findByText(
        "Preencha data e horário juntos em cada opção, ou deixe a opção vazia.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Obrigatório")).toBeInTheDocument();
    expect(surgeryRequestService.acceptAuthorization).not.toHaveBeenCalled();
  });

  it("aceita a autorização sem datas", async () => {
    const user = userEvent.setup();
    const { onSuccess } = renderModal();
    await irParaAgendamento(user);
    await user.click(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    );

    await waitFor(() =>
      expect(surgeryRequestService.acceptAuthorization).toHaveBeenCalledWith(
        "sc-1",
        {},
      ),
    );
    expect(surgeryRequestService.authorizeQuantities).toHaveBeenCalledWith(
      "sc-1",
      [{ id: "t1", authorizedQuantity: 1 }],
      [],
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("fecha com Esc e reinicia na primeira etapa", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole("button", { name: "Próximo" }));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Autorizações" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Código TUSS")).toBeInTheDocument();
  });
});
