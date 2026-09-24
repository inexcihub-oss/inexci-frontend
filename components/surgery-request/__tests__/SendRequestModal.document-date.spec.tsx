import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Quando a SC foi criada via documento e o usuário escolhe "Confirmar com
 * documento de origem" (o envio já aconteceu fora da plataforma), o wizard
 * pede a data real de envio antes de confirmar — pré-preenchida com hoje,
 * editável. Isso alimenta `lastStatusChangedAt` no backend, então o kanban
 * (badge "Há X dias neste status") e as métricas refletem a data real, não a
 * data do clique.
 */

const showToast = vi.fn();
const sendMock = vi.fn();

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    refreshSubscription: vi.fn(),
    blockReason: null,
    blockReasonCode: null,
  }),
}));

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    send: (...args: unknown[]) => sendMock(...args),
    getCcRecipients: vi.fn().mockResolvedValue([]),
    createTemplate: vi.fn(),
  },
}));

vi.mock("@/services/pendency.service", () => ({
  pendencyService: {
    validate: vi.fn().mockResolvedValue({ pendencies: [] }),
  },
}));

vi.mock("@/components/laudo/SurgeryRequestDocumentPreviewModal", () => ({
  SurgeryRequestDocumentPreviewModal: () => null,
}));

import { SendRequestModal } from "../SendRequestModal";

const solicitacao = {
  id: "sc-1",
  hospitalId: "h-1",
  patient: { name: "Maria" },
  tussItems: [{ id: "t-1" }],
  opmeItems: [{ id: "o-1" }],
  sections: [{ id: "s-1" }],
  documents: [
    {
      key: "sc_creation_source",
      uri: "documents/owner/laudo-origem.pdf",
      name: "laudo-origem.pdf",
    },
  ],
} as never;

function renderModal() {
  return render(
    <SendRequestModal
      isOpen
      onClose={vi.fn()}
      onSuccess={vi.fn()}
      solicitacao={solicitacao}
    />,
  );
}

function todayCalendarDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function chegarNaEtapaDeData(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /próximo/i }));
  await user.click(
    await screen.findByText(/confirmar com documento de origem/i),
  );
  await user.click(await screen.findByRole("button", { name: /próximo/i }));
}

describe("SendRequestModal — data de envio ao confirmar com documento de origem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({});
  });

  it("pré-preenche a data de hoje e não envia direto ao clicar em Próximo", async () => {
    const user = userEvent.setup();
    renderModal();

    await chegarNaEtapaDeData(user);

    expect(sendMock).not.toHaveBeenCalled();
    const [dia, mes, ano] = todayCalendarDate().split("-").reverse();
    expect(
      await screen.findByDisplayValue(`${dia}/${mes}/${ano}`),
    ).toBeInTheDocument();
  });

  it("confirma o envio com a data escolhida pelo usuário", async () => {
    const user = userEvent.setup();
    renderModal();

    await chegarNaEtapaDeData(user);

    const input = await screen.findByLabelText(/data do envio/i);
    await user.clear(input);
    await user.type(input, "10/01/2026");

    await user.click(
      await screen.findByRole("button", { name: /confirmar envio/i }),
    );

    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledWith(
        "sc-1",
        expect.objectContaining({ method: "document", sentAt: "2026-01-10" }),
      );
    });
  });

  it("impede confirmar com data no futuro", async () => {
    const user = userEvent.setup();
    renderModal();

    await chegarNaEtapaDeData(user);

    const input = await screen.findByLabelText(/data do envio/i);
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    const [y, m, d] = [
      futuro.getFullYear(),
      String(futuro.getMonth() + 1).padStart(2, "0"),
      String(futuro.getDate()).padStart(2, "0"),
    ];
    await user.clear(input);
    await user.type(input, `${d}/${m}/${y}`);

    await user.click(
      await screen.findByRole("button", { name: /confirmar envio/i }),
    );

    expect(
      await screen.findByText(/não pode estar no futuro/i),
    ).toBeInTheDocument();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
