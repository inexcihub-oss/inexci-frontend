import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "../Modal";

describe("Modal", () => {
  it("renderiza o rodapé fora da área rolável", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Teste" footer={<button>Ok</button>}>
        <p>conteúdo</p>
      </Modal>,
    );
    const rolavel = screen.getByText("conteúdo").parentElement!;
    expect(rolavel.className).toContain("overflow-y-auto");
    expect(rolavel.contains(screen.getByRole("button", { name: "Ok" }))).toBe(
      false,
    );
  });

  it("variante drawer usa o painel lateral no desktop", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Filtros" variant="drawer">
        <p>x</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Filtros" }).className).toContain(
      "sm:w-[420px]",
    );
  });

  it("Esc fecha, exceto com disableClose", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal isOpen onClose={onClose} title="T" disableClose>
        <p>x</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <Modal isOpen onClose={onClose} title="T">
        <p>x</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Modal — pilha, fundo e portal", () => {
  it("clique no fundo respeita disableClose", async () => {
    const { fireEvent, render, screen } = await import(
      "@testing-library/react"
    );
    const { Modal } = await import("@/components/ui/Modal");
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Travado" disableClose>
        <p>conteúdo</p>
      </Modal>,
    );
    const fundo = screen.getByRole("dialog").previousElementSibling!;
    fireEvent.click(fundo);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("com dois modais abertos, Esc fecha só o do topo", async () => {
    const { fireEvent, render } = await import("@testing-library/react");
    const { Modal } = await import("@/components/ui/Modal");
    const fecharBase = vi.fn();
    const fecharTopo = vi.fn();
    const { rerender } = render(
      <Modal isOpen onClose={fecharBase} title="Base">
        <button>a</button>
      </Modal>,
    );
    rerender(
      <>
        <Modal isOpen onClose={fecharBase} title="Base">
          <button>a</button>
        </Modal>
        <Modal isOpen onClose={fecharTopo} title={<span>Topo</span>}>
          <button>b</button>
        </Modal>
      </>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(fecharTopo).toHaveBeenCalledTimes(1);
    expect(fecharBase).not.toHaveBeenCalled();
  });

  it("renderiza no body por padrão, fora do container do chamador", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { Modal } = await import("@/components/ui/Modal");
    const { container } = render(
      <div>
        <Modal isOpen onClose={() => {}} title="Portal">
          <p>dentro</p>
        </Modal>
      </div>,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(screen.getByRole("dialog").closest("body")).toBe(document.body);
  });
});
