import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/services/clinical-snippet.service", () => ({
  clinicalSnippetService: { getAll: vi.fn().mockResolvedValue([]) },
}));

import { clinicalSnippetService } from "@/services/clinical-snippet.service";
import { clinicalSnippetKeys } from "@/lib/query-keys";
import { useClinicalSnippets } from "./useClinicalSnippets";

describe("useClinicalSnippets", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("busca os textos do próprio usuário, sem pedir os de outro médico", async () => {
    const { result } = renderHook(() => useClinicalSnippets("doc-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clinicalSnippetService.getAll).toHaveBeenCalledWith();
    expect(
      queryClient.getQueryData(clinicalSnippetKeys.mine("doc-1")),
    ).toEqual([]);
  });

  it("não busca nada sem usuário logado", () => {
    renderHook(() => useClinicalSnippets(null), { wrapper });
    expect(clinicalSnippetService.getAll).not.toHaveBeenCalled();
  });

  it("não busca quando desabilitado", () => {
    renderHook(() => useClinicalSnippets("doc-1", false), { wrapper });
    expect(clinicalSnippetService.getAll).not.toHaveBeenCalled();
  });
});
