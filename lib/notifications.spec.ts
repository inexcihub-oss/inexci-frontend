import { describe, it, expect } from "vitest";
import {
  cleanNotificationTitle,
  formatNotificationTime,
  getNotificationFilter,
  getNotificationKind,
  normalizeNotificationLink,
  NOTIFICATION_FILTERS,
  NOTIFICATION_KIND_META,
} from "./notifications";
import type { Notification } from "@/services/notification.service";

const make = (overrides: Partial<Notification>): Notification => ({
  id: "1",
  userId: "u",
  type: "info",
  title: "",
  message: "",
  read: false,
  createdAt: "2026-10-22T10:00:00Z",
  ...overrides,
});

describe("lib/notifications", () => {
  it("reconhece solicitação parada enviada como system", () => {
    const stale = make({
      type: "system",
      title: "Solicitação Parada",
      metadata: { staleDays: 14, severity: "warning" },
    });
    const critical = make({
      type: "system",
      title: "⚠️ Solicitação Parada — Ação Imediata",
      metadata: { staleDays: 49, severity: "critical" },
    });

    expect(getNotificationKind(stale)).toBe("stale");
    expect(getNotificationKind(critical)).toBe("stale_critical");
    expect(getNotificationFilter(critical)).toBe("stale");
  });

  it("separa análise de documento concluída da que falhou", () => {
    const done = make({
      title: "Análise de documento concluída",
      metadata: { category: "document_extraction", status: "done" },
    });
    const error = make({
      title: "Falha na análise do documento",
      metadata: { category: "document_extraction", status: "error" },
    });

    expect(getNotificationKind(done)).toBe("document_extraction");
    expect(getNotificationKind(error)).toBe("document_extraction_error");
    expect(getNotificationFilter(error)).toBe("document_extraction");
  });

  it("cai em informativo para tipo desconhecido", () => {
    expect(getNotificationKind(make({ type: "qualquer" }))).toBe("info");
    expect(getNotificationKind(make({ type: "system" }))).toBe("info");
  });

  it("todo filtro oferecido tem metadado", () => {
    for (const filter of NOTIFICATION_FILTERS) {
      if (filter.value)
        expect(NOTIFICATION_KIND_META[filter.value]).toBeDefined();
    }
  });

  it("remove emoji do começo do título", () => {
    expect(cleanNotificationTitle("⚠️ Solicitação Parada")).toBe(
      "Solicitação Parada",
    );
    expect(cleanNotificationTitle("Status alterado")).toBe("Status alterado");
  });

  it("normaliza link legado de solicitação sem mexer na listagem", () => {
    expect(normalizeNotificationLink("/solicitacoes-cirurgicas/1")).toBe(
      "/solicitacao/1",
    );
    expect(
      normalizeNotificationLink(
        "/solicitacoes-cirurgicas?docExtractionJobId=x",
      ),
    ).toBe("/solicitacoes-cirurgicas?docExtractionJobId=x");
  });
});

describe("formatNotificationTime", () => {
  const now = new Date(2026, 9, 22, 15, 0);

  it("usa tempo relativo só no mesmo dia", () => {
    expect(formatNotificationTime(new Date(2026, 9, 22, 14, 59, 40), now)).toBe(
      "agora",
    );
    expect(formatNotificationTime(new Date(2026, 9, 22, 14, 35), now)).toBe(
      "há 25 min",
    );
    expect(formatNotificationTime(new Date(2026, 9, 22, 9, 0), now)).toBe(
      "há 6 h",
    );
  });

  it("mostra ontem e dia da semana com horário", () => {
    expect(formatNotificationTime(new Date(2026, 9, 21, 7, 0), now)).toBe(
      "ontem, 07:00",
    );
    expect(formatNotificationTime(new Date(2026, 9, 19, 7, 0), now)).toMatch(
      /^seg\.? 07:00$/,
    );
  });

  it("mostra a data a partir de uma semana, com ano só se for outro", () => {
    expect(formatNotificationTime(new Date(2026, 9, 8, 7, 0), now)).toMatch(
      /^8 de out\.?$/,
    );
    expect(formatNotificationTime(new Date(2025, 9, 8, 7, 0), now)).toMatch(
      /^8 de out\.? de 2025$/,
    );
  });

  it("não quebra com data inválida", () => {
    expect(formatNotificationTime(new Date(NaN), now)).toBe("");
  });
});
