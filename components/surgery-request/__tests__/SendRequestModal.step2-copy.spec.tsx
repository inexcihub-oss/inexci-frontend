import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Passo 2 (escolha do método de envio) precisa deixar claro que "Download
 * Manual" e "Enviar por e-mail" usam o PDF gerado no modelo do sistema —
 * diferente de "Enviar documento de origem" e "Confirmar com documento de
 * origem", que usam o arquivo original. E o Download Manual precisa avisar
 * que a ação já marca a solicitação como enviada ao convênio.
 */

const showToast = vi.fn();

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
    send: vi.fn(),
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

const solicitacaoComOrigem = {
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

function renderModal(solicitacao: unknown) {
  return render(
    <SendRequestModal
      isOpen
      onClose={vi.fn()}
      onSuccess={vi.fn()}
      solicitacao={solicitacao as never}
    />,
  );
}

async function irParaEscolhaDeMetodo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /próximo/i }));
}

describe("SendRequestModal — clareza do passo 2 (método de envio)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("indica que Download Manual e Enviar por e-mail usam o documento gerado no modelo do sistema", async () => {
    const user = userEvent.setup();
    renderModal(solicitacaoComOrigem);

    await irParaEscolhaDeMetodo(user);

    const badges = await screen.findAllByText(/modelo do sistema/i);
    // Uma para "Download Manual", outra para "Enviar por e-mail".
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it("avisa que o Download Manual já marca a solicitação como enviada ao convênio", async () => {
    const user = userEvent.setup();
    renderModal(solicitacaoComOrigem);

    await irParaEscolhaDeMetodo(user);

    expect(
      await screen.findByText(/atualiza automaticamente o status.*enviada/i),
    ).toBeInTheDocument();
  });
});
