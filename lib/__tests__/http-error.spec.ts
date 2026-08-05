import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import {
  isUnauthorizedError,
  getApiErrorMessage,
  getBillingBlockError,
  getTransitionBlockError,
  BILLING_BLOCK_REASONS,
} from "../http-error";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAxiosError(
  status: number,
  data?: Record<string, unknown>,
): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, null, {
    status,
    statusText: "Error",
    headers,
    config: { headers },
    data: data ?? {},
  });
}

// ─── isUnauthorizedError ─────────────────────────────────────────────────────

describe("isUnauthorizedError", () => {
  it("retorna true para AxiosError com status 401", () => {
    const error = makeAxiosError(401);
    expect(isUnauthorizedError(error)).toBe(true);
  });

  it("retorna false para AxiosError com status diferente de 401", () => {
    expect(isUnauthorizedError(makeAxiosError(400))).toBe(false);
    expect(isUnauthorizedError(makeAxiosError(403))).toBe(false);
    expect(isUnauthorizedError(makeAxiosError(500))).toBe(false);
  });

  it("retorna false para Error genérico", () => {
    expect(isUnauthorizedError(new Error("fail"))).toBe(false);
  });

  it("retorna false para valor não-Error", () => {
    expect(isUnauthorizedError("string")).toBe(false);
    expect(isUnauthorizedError(null)).toBe(false);
    expect(isUnauthorizedError(undefined)).toBe(false);
    expect(isUnauthorizedError(42)).toBe(false);
  });
});

// ─── getApiErrorMessage ──────────────────────────────────────────────────────

describe("getApiErrorMessage", () => {
  it("extrai message string de AxiosError com response.data", () => {
    const error = makeAxiosError(400, { message: "E-mail já cadastrado" });
    expect(getApiErrorMessage(error)).toBe("E-mail já cadastrado");
  });

  it("junta mensagens de array (validação NestJS) com vírgula", () => {
    const error = makeAxiosError(422, {
      message: ["campo obrigatório", "e-mail inválido"],
    });
    expect(getApiErrorMessage(error)).toBe(
      "campo obrigatório, e-mail inválido",
    );
  });

  it("usa Error.message como fallback quando AxiosError não tem response.data.message", () => {
    const error = makeAxiosError(500, {});
    // AxiosError herda de Error — tem message "Request failed"
    expect(getApiErrorMessage(error)).toBe("Request failed");
  });

  it("usa fallback customizado para valores não-Error", () => {
    expect(getApiErrorMessage(null, "Erro ao salvar")).toBe("Erro ao salvar");
  });

  it("extrai message de Error genérico", () => {
    const error = new Error("Falha de rede");
    expect(getApiErrorMessage(error)).toBe("Falha de rede");
  });

  it("retorna fallback para valor primitivo", () => {
    expect(getApiErrorMessage("string error")).toBe(
      "Ocorreu um erro inesperado.",
    );
    expect(getApiErrorMessage(null)).toBe("Ocorreu um erro inesperado.");
    expect(getApiErrorMessage(undefined)).toBe("Ocorreu um erro inesperado.");
  });

  it("retorna fallback para Error sem message", () => {
    const error = new Error();
    error.message = "";
    expect(getApiErrorMessage(error)).toBe("Ocorreu um erro inesperado.");
  });

  it("prioriza AxiosError.response.data.message sobre Error.message", () => {
    const error = makeAxiosError(400, {
      message: "Mensagem da API",
    });
    // AxiosError herda de Error — deve preferir a data.message
    expect(getApiErrorMessage(error)).toBe("Mensagem da API");
  });
});

// ─── getBillingBlockError ────────────────────────────────────────────────────

describe("getBillingBlockError", () => {
  it("extrai reason e message de um 402 de cota atingida", () => {
    const error = makeAxiosError(402, {
      message: "Você atingiu o limite de 20 solicitações do seu plano.",
      reason: "quota_exceeded",
    });

    expect(getBillingBlockError(error)).toEqual({
      reason: "quota_exceeded",
      message: "Você atingiu o limite de 20 solicitações do seu plano.",
    });
  });

  it.each(BILLING_BLOCK_REASONS)("reconhece o reason %s", (reason) => {
    const error = makeAxiosError(402, { message: "Bloqueado.", reason });
    expect(getBillingBlockError(error)?.reason).toBe(reason);
  });

  it("cai em 'unknown' quando o 402 vem sem reason", () => {
    const error = makeAxiosError(402, { message: "Pagamento necessário." });

    expect(getBillingBlockError(error)).toEqual({
      reason: "unknown",
      message: "Pagamento necessário.",
    });
  });

  it("cai em 'unknown' quando o reason não é conhecido", () => {
    const error = makeAxiosError(402, {
      message: "Bloqueado.",
      reason: "motivo_novo_do_backend",
    });

    expect(getBillingBlockError(error)?.reason).toBe("unknown");
  });

  it("usa mensagem padrão quando o 402 não traz message", () => {
    const error = makeAxiosError(402, { reason: "quota_exceeded" });

    expect(getBillingBlockError(error)?.message).toBe(
      "Sua assinatura não permite esta ação no momento.",
    );
  });

  it("retorna null para status diferente de 402", () => {
    expect(getBillingBlockError(makeAxiosError(400))).toBeNull();
    expect(getBillingBlockError(makeAxiosError(403))).toBeNull();
    expect(
      getBillingBlockError(makeAxiosError(500, { reason: "quota_exceeded" })),
    ).toBeNull();
  });

  it("retorna null para erros que não são AxiosError", () => {
    expect(getBillingBlockError(new Error("fail"))).toBeNull();
    expect(getBillingBlockError(null)).toBeNull();
    expect(getBillingBlockError(undefined)).toBeNull();
  });
});

// ─── getTransitionBlockError ─────────────────────────────────────────────────

describe("getTransitionBlockError", () => {
  it("formata a mensagem com as pendências do 400", () => {
    const error = makeAxiosError(400, {
      message: "Não é possível avançar.",
      pendencies: [
        { key: "medical_report", name: "Laudo" },
        { key: "opme_items", name: "OPME" },
      ],
    });

    expect(getTransitionBlockError(error)).toBe(
      "Não é possível avançar. Pendências: Laudo, OPME",
    );
  });

  it("retorna null para 400 sem pendências", () => {
    expect(getTransitionBlockError(makeAxiosError(400, { message: "x" }))).toBeNull();
    expect(
      getTransitionBlockError(makeAxiosError(400, { pendencies: [] })),
    ).toBeNull();
  });

  it("retorna null para 402 (bloqueio comercial, não pendência)", () => {
    const error = makeAxiosError(402, {
      message: "Limite atingido.",
      reason: "quota_exceeded",
    });
    expect(getTransitionBlockError(error)).toBeNull();
  });
});
