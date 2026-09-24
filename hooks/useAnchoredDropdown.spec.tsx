import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useAnchoredDropdown } from "./useAnchoredDropdown";

function Harness({ placement }: { placement?: "bottom" | "auto" }) {
  const { anchorRef, position } = useAnchoredDropdown(true, undefined, {
    placement,
  });
  return (
    <div
      ref={anchorRef}
      data-testid="anchor"
      data-placement={position.placement}
      data-top={String(position.top)}
      data-bottom={String(position.bottom)}
    />
  );
}

function mockRect(rect: { top: number; bottom: number }) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: rect.top,
    bottom: rect.bottom,
    left: 0,
    right: 320,
    width: 320,
    height: rect.bottom - rect.top,
    x: 0,
    y: rect.top,
    toJSON: () => ({}),
  } as DOMRect);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useAnchoredDropdown", () => {
  it("abre para baixo por padrão, mesmo colado no rodapé", () => {
    window.innerHeight = 700;
    mockRect({ top: 640, bottom: 680 });

    render(<Harness />);

    const anchor = screen.getByTestId("anchor");
    expect(anchor.dataset.placement).toBe("bottom");
    expect(anchor.dataset.top).toBe("680");
  });

  it("vira para cima no bottom-sheet do mobile, onde não há espaço abaixo", () => {
    window.innerHeight = 700;
    mockRect({ top: 640, bottom: 680 });

    render(<Harness placement="auto" />);

    const anchor = screen.getByTestId("anchor");
    expect(anchor.dataset.placement).toBe("top");
    // distância do fundo da janela até o topo do campo: 700 - 640
    expect(anchor.dataset.bottom).toBe("60");
  });

  it("continua abrindo para baixo em auto quando há espaço sobrando", () => {
    window.innerHeight = 900;
    mockRect({ top: 100, bottom: 140 });

    render(<Harness placement="auto" />);

    const anchor = screen.getByTestId("anchor");
    expect(anchor.dataset.placement).toBe("bottom");
    expect(anchor.dataset.top).toBe("140");
  });
});
