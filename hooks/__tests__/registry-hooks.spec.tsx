import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/services/hospital.service", () => ({
  hospitalService: {
    getAll: vi.fn().mockResolvedValue([
      { id: "h1", name: "Santa Casa" },
      { id: 2, name: "São Lucas" },
    ]),
  },
}));

import { findRegistryItem } from "../createRegistryQuery";
import { useHospital, useHospitals, HOSPITALS_QUERY_KEY } from "../useHospitals";
import { hospitalService } from "@/services/hospital.service";

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

describe("findRegistryItem", () => {
  it("compara ids como texto e devolve null sem id", () => {
    const items = [{ id: 7, name: "a" }];
    expect(findRegistryItem(items, "7")).toEqual({ id: 7, name: "a" });
    expect(findRegistryItem(items, null)).toBeNull();
    expect(findRegistryItem(undefined, "7")).toBeNull();
    expect(findRegistryItem(items, "8")).toBeNull();
  });
});

describe("hooks de cadastro (createRegistryQuery)", () => {
  it("useHospitals guarda a lista na chave de sempre", async () => {
    const { client, Wrapper } = wrapper();
    const { result } = renderHook(() => useHospitals(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(HOSPITALS_QUERY_KEY)).toHaveLength(2);
  });

  it("useHospital acha o item na lista em cache, sem GET por id", async () => {
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useHospital("2"), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.hospital?.name).toBe("São Lucas"));
    expect(hospitalService.getAll).toHaveBeenCalled();
  });

  it("useHospital sem id não busca nada", () => {
    vi.mocked(hospitalService.getAll).mockClear();
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useHospital(undefined), {
      wrapper: Wrapper,
    });
    expect(result.current.hospital).toBeNull();
    expect(hospitalService.getAll).not.toHaveBeenCalled();
  });
});
