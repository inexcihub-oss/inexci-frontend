import { describe, it, expect } from "vitest";
import {
  channelHealth,
  formatJobResult,
  jobCountMessage,
} from "./admin-system";

describe("admin-system", () => {
  it("lê o estado de cada canal do corpo do terminus", () => {
    const health = {
      status: "error" as const,
      details: {
        redis: { status: "up" as const },
        smtp: { status: "down" as const, message: "timeout" },
      },
    };
    expect(channelHealth(health, "redis")).toEqual({
      state: "up",
      message: null,
    });
    expect(channelHealth(health, "smtp")).toEqual({
      state: "down",
      message: "timeout",
    });
    expect(channelHealth(health, "twilio").state).toBe("unknown");
    expect(channelHealth(undefined, "redis").state).toBe("unknown");
  });

  it("escreve a contagem no singular e no plural", () => {
    expect(jobCountMessage("stale_requests", 1)).toBe("1 aviso enviado");
    expect(jobCountMessage("stale_requests", 0)).toBe("0 avisos enviados");
    expect(jobCountMessage("weekly_summary", 5)).toBe("5 resumos enviados");
  });

  it("formata o resultado guardado na auditoria", () => {
    expect(formatJobResult("stale_requests", { notified: 2 })).toBe(
      "2 avisos enviados",
    );
    expect(formatJobResult("weekly_summary", { dispatched: 1 })).toBe(
      "1 resumo enviado",
    );
    expect(formatJobResult("weekly_summary", 3)).toBe("3 resumos enviados");
    expect(formatJobResult("weekly_summary", "falhou")).toBe("falhou");
    expect(formatJobResult("weekly_summary", null)).toBe("—");
  });
});
