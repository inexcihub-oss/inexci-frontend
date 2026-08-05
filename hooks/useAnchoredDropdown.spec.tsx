import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useAnchoredDropdown } from "./useAnchoredDropdown";

function Harness({
  open,
  onClose,
}: {
  open: boolean;
  onClose?: () => void;
}) {
  const { anchorRef, dropdownRef, position } = useAnchoredDropdown(
    open,
    onClose,
  );
  return (
    <div>
      <div ref={anchorRef} data-testid="anchor" />
      {/* Simula o portal: o dropdown vive fora da árvore do campo. */}
      <div ref={dropdownRef} data-testid="dropdown" />
      <span data-testid="pos">
        {position.top}:{position.left}:{position.width}
      </span>
      <button data-testid="fora">fora</button>
    </div>
  );
}

describe("useAnchoredDropdown", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 140,
      left: 30,
      right: 230,
      width: 200,
      height: 40,
      x: 30,
      y: 100,
      toJSON: () => ({}),
    });
  });

  it("ancora o dropdown logo abaixo do campo", () => {
    render(<Harness open />);

    expect(screen.getByTestId("pos").textContent).toBe("140:30:200");
  });

  it("não calcula posição enquanto está fechado", () => {
    render(<Harness open={false} />);

    expect(screen.getByTestId("pos").textContent).toBe("0:0:0");
  });

  // Dentro de um modal o corpo rola: sem recalcular, o dropdown fica preso no
  // lugar antigo enquanto o campo se move.
  it("reposiciona ao rolar a página", () => {
    render(<Harness open />);

    (
      HTMLElement.prototype.getBoundingClientRect as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      top: 40,
      bottom: 80,
      left: 30,
      right: 230,
      width: 200,
      height: 40,
      x: 30,
      y: 40,
      toJSON: () => ({}),
    });

    act(() => {
      window.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    expect(screen.getByTestId("pos").textContent).toBe("80:30:200");
  });

  describe("fechamento por clique fora", () => {
    // Com o dropdown em portal, ele fica fora da árvore do campo: um
    // "clique fora" ingênuo fecharia a lista antes de o clique na opção
    // registrar, e escolher item viraria impossível.
    it("não fecha ao clicar dentro do dropdown", () => {
      const onClose = vi.fn();
      render(<Harness open onClose={onClose} />);

      act(() => {
        screen
          .getByTestId("dropdown")
          .dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it("não fecha ao clicar no próprio campo", () => {
      const onClose = vi.fn();
      render(<Harness open onClose={onClose} />);

      act(() => {
        screen
          .getByTestId("anchor")
          .dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it("fecha ao clicar em qualquer outro lugar", () => {
      const onClose = vi.fn();
      render(<Harness open onClose={onClose} />);

      act(() => {
        screen
          .getByTestId("fora")
          .dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });

      expect(onClose).toHaveBeenCalled();
    });

    it("não escuta cliques enquanto está fechado", () => {
      const onClose = vi.fn();
      render(<Harness open={false} onClose={onClose} />);

      act(() => {
        screen
          .getByTestId("fora")
          .dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
