import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import {
  TestProviders,
  createTestQueryClient,
} from "@/test-utils/render-with-providers";

const refreshSubscription = vi.fn();
const sendMock = vi.fn();
const getCcRecipientsMock = vi.fn();
const createTemplateMock = vi.fn();
const validateMock = vi.fn();

let authState: {
  refreshSubscription: typeof refreshSubscription;
  blockReason: string | null;
  blockReasonCode: string | null;
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    send: (...args: unknown[]) => sendMock(...args),
    getCcRecipients: (...args: unknown[]) => getCcRecipientsMock(...args),
    createTemplate: (...args: unknown[]) => createTemplateMock(...args),
    exportPdf: vi.fn(),
  },
}));

vi.mock("@/services/pendency.service", () => ({
  pendencyService: {
    validate: (...args: unknown[]) => validateMock(...args),
  },
}));

import { buildChecklist, useSendRequestFlow } from "../useSendRequestFlow";

const baseSolicitacao = {
  id: "sc-1",
  hospitalId: "h-1",
  patient: { name: "Maria" },
  tussItems: [{ id: "t-1" }],
  opmeItems: [{ id: "o-1" }],
  sections: [{ id: "s-1" }],
  documents: [],
};

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

function setup(
  overrides: Partial<Parameters<typeof useSendRequestFlow>[0]> = {},
  solicitacao: Record<string, unknown> = baseSolicitacao,
) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient}>{children}</TestProviders>
  );
  const hook = renderHook(
    () =>
      useSendRequestFlow({
        isOpen: true,
        solicitacao: solicitacao as never,
        onClose,
        onSuccess,
        ...overrides,
      }),
    { wrapper },
  );
  return { ...hook, onClose, onSuccess };
}

describe("useSendRequestFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      refreshSubscription,
      blockReason: null,
      blockReasonCode: null,
    };
    validateMock.mockResolvedValue({ pendencies: [] });
    getCcRecipientsMock.mockResolvedValue([]);
    sendMock.mockResolvedValue({});
  });

  it("monta o checklist a partir da validação e libera o avanço quando tudo está completo", async () => {
    const { result } = setup();

    await waitFor(() => expect(result.current.checklist).toHaveLength(4));
    expect(validateMock).toHaveBeenCalledWith("sc-1");
    expect(result.current.canProceed).toBe(true);
    expect(result.current.isNextDisabled).toBe(false);
    expect(result.current.title).toBe("Enviar Solicitação");
    expect(result.current.email.subject).toBe("Solicitação Cirúrgica - Maria");
  });

  it("usa a validação inicial sem consultar a API e bloqueia o avanço com pendência", async () => {
    const { result } = setup({
      initialValidation: {
        pendencies: [
          { key: "medical_report", isComplete: false },
          { key: "tuss_procedures", isComplete: true },
          { key: "opme_items", isComplete: true },
        ],
      } as never,
    });

    await waitFor(() => expect(result.current.checklist).toHaveLength(4));
    expect(validateMock).not.toHaveBeenCalled();
    expect(
      result.current.checklist.find((i) => i.key === "hospital")?.isComplete,
    ).toBe(true);
    expect(result.current.canProceed).toBe(false);
    expect(result.current.isNextDisabled).toBe(true);
  });

  it("abre o bloqueio comercial já conhecido e o dispensa fechando o modal", async () => {
    authState.blockReasonCode = "quota_exceeded";
    authState.blockReason = null;
    const { result, onClose } = setup();

    await waitFor(() =>
      expect(result.current.billingBlock).toEqual({
        reason: "quota_exceeded",
        message: "Assinatura não permite o envio.",
      }),
    );

    act(() => result.current.dismissBillingBlock());
    expect(result.current.billingBlock).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  it("no passo do e-mail carrega os CCs sugeridos e valida campos obrigatórios", async () => {
    getCcRecipientsMock.mockResolvedValue([{ email: "cc@clinica.com" }]);
    const { result } = setup();
    await waitFor(() => expect(result.current.checklist).toHaveLength(4));

    await act(() => result.current.handleNext());
    act(() => result.current.setSendMethod("email"));
    await act(() => result.current.handleNext());

    expect(result.current.currentStep).toBe(3);
    expect(result.current.title).toBe("Enviar por e-mail");
    await waitFor(() =>
      expect(result.current.email.cc.tags).toEqual(["cc@clinica.com"]),
    );

    act(() => result.current.email.setSubject(" "));
    await act(() => result.current.handleNext());

    expect(sendMock).not.toHaveBeenCalled();
    expect(result.current.email.touched).toBe(true);
    expect(
      await screen.findByText("Preencha: Destinatários, Assunto"),
    ).toBeInTheDocument();
  });

  it("envia o documento de origem por e-mail e conclui com onSuccess ao fechar", async () => {
    const { result, onSuccess, onClose } = setup(
      {},
      {
        ...baseSolicitacao,
        documents: [
          { key: "sc_creation_source", uri: "x/origem.pdf", name: "origem.pdf" },
        ],
      },
    );
    await waitFor(() => expect(result.current.checklist).toHaveLength(4));
    expect(result.current.hasSourceDocument).toBe(true);

    await act(() => result.current.handleNext());
    act(() => result.current.setSendMethod("email_source"));
    await act(() => result.current.handleNext());
    expect(result.current.title).toBe("Enviar documento de origem por e-mail");

    act(() => result.current.email.to.setTags(["conv@plano.com", "b@plano.com"]));
    await act(() => result.current.handleNext());

    expect(sendMock).toHaveBeenCalledWith("sc-1", {
      method: "email",
      to: "conv@plano.com;b@plano.com",
      subject: "Solicitação Cirúrgica - Maria",
      message: "",
      cc: undefined,
      useSourceDocument: true,
    });
    expect(refreshSubscription).toHaveBeenCalled();
    expect(result.current.currentStep).toBe(4);

    act(() => result.current.handleClose());
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("salva o modelo quando pedido após o envio", async () => {
    createTemplateMock.mockResolvedValue({});
    const { result } = setup(
      {},
      {
        ...baseSolicitacao,
        documents: [
          { key: "sc_creation_source", uri: "x/origem.pdf", name: "origem.pdf" },
        ],
      },
    );
    await waitFor(() => expect(result.current.checklist).toHaveLength(4));

    act(() => {
      result.current.setSaveAsTemplate(true);
      result.current.setTemplateName("Meu modelo");
    });
    await act(() => result.current.handleNext());
    act(() => result.current.setSendMethod("document"));
    await act(() => result.current.handleNext());
    expect(result.current.title).toBe("Data de envio");
    await act(() => result.current.handleNext());

    expect(createTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Meu modelo" }),
    );
    expect(result.current.saveAsTemplate).toBe(false);
    expect(
      await screen.findByText("Modelo salvo com sucesso!"),
    ).toBeInTheDocument();
  });

  it("rejeita data de envio inválida e limpa o erro ao trocar a data", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.checklist).toHaveLength(4));

    await act(() => result.current.handleNext());
    act(() => result.current.setSendMethod("document"));
    await act(() => result.current.handleNext());

    act(() => result.current.setSentAt(""));
    await act(() => result.current.handleNext());
    expect(result.current.sentAtError).toBe(
      "Informe a data em que a solicitação foi enviada.",
    );

    act(() => result.current.setSentAt("2026-01-10"));
    expect(result.current.sentAtError).toBeNull();
  });

  it("transforma 402 do envio em bloqueio comercial sem toast", async () => {
    sendMock.mockRejectedValue(
      erroHttp(402, { message: "Limite atingido.", reason: "quota_exceeded" }),
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.checklist).toHaveLength(4));

    await act(() => result.current.handleNext());
    act(() => result.current.setSendMethod("document"));
    await act(() => result.current.handleNext());
    await act(() => result.current.handleNext());

    expect(result.current.billingBlock?.reason).toBe("quota_exceeded");
    expect(result.current.isSending).toBe(false);
    expect(refreshSubscription).toHaveBeenCalled();
  });

  it("ignora anexos acima do limite avisando por toast", async () => {
    const { result } = setup();
    const pequeno = new File(["a"], "pequeno.pdf");
    const grande = new File(["a"], "grande.pdf");
    Object.defineProperty(grande, "size", { value: 500 * 1024 * 1024 });

    act(() => result.current.addAttachments([pequeno, grande]));

    expect(result.current.attachments).toEqual([pequeno]);
    expect(
      await screen.findByText(/1 arquivo\(s\) ignorado\(s\)/),
    ).toBeInTheDocument();

    act(() => result.current.removeAttachment(0));
    expect(result.current.attachments).toEqual([]);
  });

  it("não fecha enquanto envia e volta de passo com handleBack", async () => {
    let resolveSend: (value: unknown) => void = () => {};
    sendMock.mockReturnValue(new Promise((r) => (resolveSend = r)));
    const { result, onClose } = setup();
    await waitFor(() => expect(result.current.checklist).toHaveLength(4));

    await act(() => result.current.handleNext());
    act(() => result.current.handleBack());
    expect(result.current.currentStep).toBe(1);

    await act(() => result.current.handleNext());
    act(() => result.current.setSendMethod("document"));
    await act(() => result.current.handleNext());

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.handleNext();
    });
    expect(result.current.isSending).toBe(true);
    expect(result.current.isNextDisabled).toBe(true);

    act(() => result.current.handleClose());
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      resolveSend({});
      await pending;
    });
    expect(result.current.currentStep).toBe(4);
  });
});

describe("buildChecklist", () => {
  it("usa os dados da solicitação quando a validação não traz pendências", () => {
    const items = buildChecklist({ pendencies: [] } as never, {
      ...baseSolicitacao,
      hospitalId: undefined,
      sections: [],
    } as never);

    expect(items.map((i) => [i.key, i.isComplete])).toEqual([
      ["hospital", false],
      ["tuss_procedures", true],
      ["opme_items", true],
      ["medical_report", false],
    ]);
  });
});
