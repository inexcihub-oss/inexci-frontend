import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCadastroList } from "../useCadastroList";

type Item = { id: string; name: string; email?: string; city?: string };

const KEY = ["coisas"] as const;
const ITEMS: Item[] = [
  { id: "1", name: "Hospital Alfa", email: "alfa@x.com", city: "Rio" },
  { id: "2", name: "Beta", email: "contato@beta.com", city: "Niterói" },
];

function setup(
  options: Partial<Parameters<typeof useCadastroList<Item>>[0]> = {},
) {
  const client = new QueryClient();
  client.setQueryData(KEY, ITEMS);
  const service = {
    delete: vi.fn().mockResolvedValue(undefined),
    deleteMany: vi.fn().mockResolvedValue(undefined),
  };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () =>
      useCadastroList<Item>({
        queryKey: KEY,
        items: client.getQueryData<Item[]>(KEY) ?? [],
        service,
        ...options,
      }),
    { wrapper: Wrapper },
  );
  return { client, service, ...hook };
}

const click = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;

describe("useCadastroList", () => {
  it("busca por nome e e-mail por padrão", async () => {
    const { result } = setup();
    act(() => result.current.setSearchTerm("BETA"));
    await waitFor(() =>
      expect(result.current.filtered.map((i) => i.id)).toEqual(["2"]),
    );
  });

  it("aceita campos de busca próprios", async () => {
    const byCity = (i: Item) => [i.city];
    const { result } = setup({ searchFields: byCity });
    act(() => result.current.setSearchTerm("rio"));
    await waitFor(() =>
      expect(result.current.filtered.map((i) => i.id)).toEqual(["1"]),
    );
  });

  it("excluir um item tira do cache e chama onDeleted", async () => {
    const onDeleted = vi.fn();
    const { result, client, service } = setup({ onDeleted });
    act(() => result.current.requestDelete(ITEMS[0], click));
    expect(result.current.deleteState).toMatchObject({
      open: true,
      name: "Hospital Alfa",
    });
    await act(() => result.current.confirmDelete());
    expect(service.delete).toHaveBeenCalledWith("1");
    expect(onDeleted).toHaveBeenCalledWith(["1"]);
    expect(client.getQueryData<Item[]>(KEY)?.map((i) => i.id)).toEqual(["2"]);
    expect(result.current.deleteState.open).toBe(false);
  });

  it("exclusão em massa usa as linhas selecionadas e limpa a seleção", async () => {
    const { result, client, service } = setup();
    act(() => result.current.setRowSelection({ 0: true, 1: true }));
    expect(result.current.selectedItems).toHaveLength(2);
    act(() => result.current.openBulkDelete());
    await act(() => result.current.confirmBulkDelete());
    expect(service.deleteMany).toHaveBeenCalledWith(["1", "2"]);
    expect(client.getQueryData<Item[]>(KEY)).toEqual([]);
    expect(result.current.rowSelection).toEqual({});
    expect(result.current.bulkDelete.open).toBe(false);
  });

  it("falha ao excluir mantém o modal aberto e o item na lista", async () => {
    const { result, client, service } = setup();
    service.delete.mockRejectedValueOnce(new Error("500"));
    act(() => result.current.requestDelete(ITEMS[1], click));
    await act(() => result.current.confirmDelete());
    expect(result.current.deleteState).toMatchObject({
      open: true,
      loading: false,
    });
    expect(client.getQueryData<Item[]>(KEY)).toHaveLength(2);
  });
});
