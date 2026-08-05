import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";

/**
 * Bug relatado: ao atingir o limite de solicitações do plano, o envio
 * PENDING → SENT simplesmente parava de funcionar. O backend devolvia
 * 402 com `reason: quota_exceeded`, mas o modal só sabia interpretar o 400
 * de pendências e caía num toast genérico ("Erro ao enviar solicitação").
 *
 * Agora o 402 abre o aviso de bloqueio, com caminho de upgrade.
 */

const showToast = vi.fn();
const refreshSubscription = vi.fn();
const sendMock = vi.fn();

let authState: {
  refreshSubscription: typeof refreshSubscription;
  blockReason: string | null;
  blockReasonCode: string | null;
};

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
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

vi.mock("@/components/billing/BillingLimitModal", () => ({
  BillingLimitModal: ({ block }: { block: { reason: string } }) => (
    <div data-testid="billing-limit-modal" data-reason={block.reason}>
      Aviso de bloqueio
    </div>
  ),
}));

import { SendRequestModal } from "../SendRequestModal";

function erroHttp(status: number, data: Record<string, unknown>): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, null, {
    status,
    statusText: "Error",
    headers,
    config: { headers },
    data,
  });
}

const solicitacao = {
  id: "sc-1",
  hospitalId: "h-1",
  patient: { name: "Maria" },
  tussItems: [{ id: "t-1" }],
  opmeItems: [{ id: "o-1" }],
  sections: [{ id: "s-1" }],
  documents: [],
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

/** Percorre o wizard até disparar o envio por download (caminho mais curto). */
async function enviarPorDownload(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /próximo/i }));
  await user.click(await screen.findByText(/download manual/i));
  await user.click(await screen.findByRole("button", { name: /próximo/i }));
}

describe("SendRequestModal — bloqueio comercial no envio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      refreshSubscription,
      blockReason: null,
      blockReasonCode: null,
    };
  });

  it("abre o aviso de bloqueio quando o backend responde 402 de cota", async () => {
    const user = userEvent.setup();
    sendMock.mockRejectedValue(
      erroHttp(402, {
        message: "Você atingiu o limite de 20 solicitações do seu plano.",
        reason: "quota_exceeded",
      }),
    );

    renderModal();
    await enviarPorDownload(user);

    const aviso = await screen.findByTestId("billing-limit-modal");
    expect(aviso).toHaveAttribute("data-reason", "quota_exceeded");
    expect(showToast).not.toHaveBeenCalled();
    expect(refreshSubscription).toHaveBeenCalled();
  });

  it("avisa antes de chamar a API quando a assinatura já é conhecida como bloqueada", async () => {
    authState.blockReasonCode = "quota_exceeded";
    authState.blockReason = "Você atingiu o limite de 20 solicitações.";

    renderModal();

    const aviso = await screen.findByTestId("billing-limit-modal");
    expect(aviso).toHaveAttribute("data-reason", "quota_exceeded");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("mantém o toast de pendências para o 400 (não sequestra outros erros)", async () => {
    const user = userEvent.setup();
    sendMock.mockRejectedValue(
      erroHttp(400, {
        message: "Não é possível avançar.",
        pendencies: [{ key: "medical_report", name: "Laudo" }],
      }),
    );

    renderModal();
    await enviarPorDownload(user);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        "Não é possível avançar. Pendências: Laudo",
        "error",
      );
    });
    expect(screen.queryByTestId("billing-limit-modal")).not.toBeInTheDocument();
  });

  it("usa a mensagem da API em erros comuns em vez do texto genérico", async () => {
    const user = userEvent.setup();
    sendMock.mockRejectedValue(
      erroHttp(500, { message: "Falha ao gerar o PDF da solicitação." }),
    );

    renderModal();
    await enviarPorDownload(user);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        "Falha ao gerar o PDF da solicitação.",
        "error",
      );
    });
  });
});
