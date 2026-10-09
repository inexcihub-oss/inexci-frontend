import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: {
    getAvailableDoctors: vi.fn().mockResolvedValue([]),
  },
}));

import { availableDoctorsService } from "@/services/available-doctors.service";
import { useAvailableDoctors } from "./useAvailableDoctors";

describe("useAvailableDoctors", () => {
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

  it("reaproveita o cache entre montagens por padrão", async () => {
    const primeira = renderHook(() => useAvailableDoctors(), { wrapper });
    await waitFor(() => expect(primeira.result.current.isSuccess).toBe(true));
    primeira.unmount();

    renderHook(() => useAvailableDoctors(), { wrapper });

    expect(availableDoctorsService.getAvailableDoctors).toHaveBeenCalledTimes(1);
  });

  it("com fresh, busca de novo ao montar mesmo com o cache preenchido", async () => {
    const primeira = renderHook(() => useAvailableDoctors(), { wrapper });
    await waitFor(() => expect(primeira.result.current.isSuccess).toBe(true));
    primeira.unmount();

    renderHook(() => useAvailableDoctors({ fresh: true }), { wrapper });

    await waitFor(() =>
      expect(availableDoctorsService.getAvailableDoctors).toHaveBeenCalledTimes(
        2,
      ),
    );
  });
});
