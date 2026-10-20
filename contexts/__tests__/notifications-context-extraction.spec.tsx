import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";

const { handlers } = vi.hoisted(() => ({
  handlers: {} as Record<string, (payload: unknown) => void>,
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: (event: string, handler: (payload: unknown) => void) => {
      handlers[event] = handler;
    },
    disconnect: vi.fn(),
  })),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u-1" } }),
}));

vi.mock("@/lib/auth-token", () => ({
  getAccessToken: () => "token",
}));

vi.mock("@/services/notification.service", () => ({
  notificationService: { markAsRead: vi.fn().mockResolvedValue(undefined) },
}));

import { NotificationsProvider } from "../NotificationsContext";
import {
  SC_FROM_DOCUMENT_EXTRACTION_ACTIVE_KEY,
  SC_FROM_DOCUMENT_EXTRACTION_PENDING_KEY,
  getScFromDocumentStorage,
  setScFromDocumentStorage,
} from "@/lib/sc-from-document-background";

describe("NotificationsContext — extração em segundo plano", () => {
  const originalUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    localStorage.clear();
    process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalUrl;
  });

  it("guarda só o jobId quando a análise termina, nunca o resultado clínico", () => {
    setScFromDocumentStorage(SC_FROM_DOCUMENT_EXTRACTION_ACTIVE_KEY, {
      jobId: "job-1",
      fileName: "laudo.pdf",
      startedAt: Date.now(),
    });

    render(
      <NotificationsProvider>
        <div />
      </NotificationsProvider>,
    );

    act(() => {
      handlers["document-extraction:status"]({
        jobId: "job-1",
        status: "done",
        result: {
          extracted: { patient: { name: "Paciente", cpf: "12345678900" } },
          tempStoragePath: "whatsapp-tmp/laudo.pdf",
        },
      });
    });

    expect(
      getScFromDocumentStorage(SC_FROM_DOCUMENT_EXTRACTION_PENDING_KEY),
    ).toEqual({ jobId: "job-1" });
    const salvo = Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.getItem(localStorage.key(i) ?? ""),
    ).join("|");
    expect(salvo).toContain("job-1");
    expect(salvo).not.toContain("12345678900");
    expect(
      localStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_ACTIVE_KEY),
    ).toBeNull();
  });
});
