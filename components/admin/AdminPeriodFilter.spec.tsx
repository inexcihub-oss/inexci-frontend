import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  renderHook,
  act,
} from "@testing-library/react";
import { AdminPeriodFilter, useAdminPeriod } from "./AdminPeriodFilter";

function Harness() {
  const state = useAdminPeriod();
  return <AdminPeriodFilter state={state} />;
}

describe("AdminPeriodFilter", () => {
  it("período rola na horizontal e o personalizado mostra De e Até com rótulo e largura total", () => {
    render(<Harness />);
    const group = screen.getByRole("group", { name: "Período" });
    expect(group.parentElement).toHaveClass("overflow-x-auto");

    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));
    const from = screen.getByLabelText("De");
    const to = screen.getByLabelText("Até");
    expect(from.closest("label")).toHaveTextContent("De");
    expect(to.closest("label")).toHaveTextContent("Até");
    expect(from).toHaveClass("w-full", "sm:w-auto");
  });

  describe("useAdminPeriod", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("avança o intervalo dos presets quando o dia vira com a tela aberta", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-09T23:59:30-03:00"));
      const { result } = renderHook(() => useAdminPeriod("7d"));
      const antes = result.current.range?.to;

      act(() => {
        vi.setSystemTime(new Date("2026-11-10T00:00:30-03:00"));
        vi.advanceTimersByTime(60_000);
      });

      expect(result.current.range?.to).not.toBe(antes);
    });
  });
});
