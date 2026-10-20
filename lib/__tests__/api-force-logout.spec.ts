import { describe, it, expect, vi } from "vitest";

const { postMock, handlers } = vi.hoisted(() => ({
  postMock: vi.fn(),
  handlers: {} as { onError?: (error: unknown) => Promise<unknown> },
}));

vi.mock("axios", () => {
  const create = vi.fn(() => ({
    defaults: { baseURL: "http://api.test" },
    interceptors: {
      request: { use: vi.fn() },
      response: {
        use: vi.fn((_ok: unknown, onError: (error: unknown) => Promise<unknown>) => {
          handlers.onError = onError;
        }),
      },
    },
  }));
  return {
    default: { create, post: postMock },
    AxiosError: class AxiosError extends Error {},
  };
});

const broadcastAuthEvent = vi.fn();

vi.mock("../auth-sync", () => ({
  broadcastAuthEvent: (...args: unknown[]) => broadcastAuthEvent(...args),
}));

import "../api";
import {
  SC_FROM_DOCUMENT_EXTRACTION_KEY,
  setScFromDocumentStorage,
} from "../sc-from-document-background";

describe("forceLogout", () => {
  it("limpa o handoff da SC via documento e avisa as outras abas", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setScFromDocumentStorage(SC_FROM_DOCUMENT_EXTRACTION_KEY, {
      jobId: "job-1",
      userId: "u-1",
      savedAt: Date.now(),
    });
    postMock.mockRejectedValue({ response: { status: 401 } });

    await expect(
      handlers.onError!({
        response: { status: 401 },
        config: { url: "/patients", headers: {} },
      }),
    ).rejects.toBeDefined();

    expect(localStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_KEY)).toBeNull();
    expect(broadcastAuthEvent).toHaveBeenCalledWith({ type: "logout" });
  });
});
