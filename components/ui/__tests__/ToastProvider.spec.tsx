import { describe, it, expect } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import { useToast } from "@/hooks/useToast";

function SemToastLocal() {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast("Salvo com sucesso", "success")}>
      salvar
    </button>
  );
}

describe("ToastProvider — regressão do toast que nunca aparecia", () => {
  it("mostra o toast de quem só chama showToast", () => {
    render(
      <ToastProvider>
        <SemToastLocal />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("salvar"));
    expect(screen.getByText("Salvo com sucesso")).toBeInTheDocument();
  });

  it("fechar pelo botão some com o toast global", () => {
    render(
      <ToastProvider>
        <SemToastLocal />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("salvar"));
    const fechar = screen
      .getByText("Salvo com sucesso")
      .parentElement!.querySelector("button")!;
    act(() => fechar.click());
    expect(screen.queryByText("Salvo com sucesso")).toBeNull();
  });

  it("fora do provider vira no-op (não quebra o componente)", () => {
    render(<SemToastLocal />);
    fireEvent.click(screen.getByText("salvar"));
    expect(screen.queryByText("Salvo com sucesso")).toBeNull();
  });

  it("renderWithProviders expõe o toast global ao teste", () => {
    renderWithProviders(<SemToastLocal />);
    fireEvent.click(screen.getByText("salvar"));
    expect(screen.getByText("Salvo com sucesso")).toBeInTheDocument();
  });

  it("showToast mantém a identidade entre toasts (não re-dispara efeitos)", () => {
    const identidades: unknown[] = [];
    function Espiao() {
      const { showToast } = useToast();
      identidades.push(showToast);
      return <button onClick={() => showToast("x")}>ok</button>;
    }
    render(
      <ToastProvider>
        <Espiao />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("ok"));
    expect(new Set(identidades).size).toBe(1);
  });
});
