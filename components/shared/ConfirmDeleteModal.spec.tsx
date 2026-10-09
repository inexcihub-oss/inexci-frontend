import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

describe("ConfirmDeleteModal — acessibilidade", () => {
  function abrir(over: Partial<Parameters<typeof ConfirmDeleteModal>[0]> = {}) {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDeleteModal
        isOpen
        title="Excluir paciente"
        description="Excluir Ana Beatriz?"
        onCancel={onCancel}
        onConfirm={onConfirm}
        {...over}
      />,
    );
    return { onCancel, onConfirm };
  }

  it("é um alertdialog modal nomeado pelo título e descrito pelo texto", () => {
    abrir();

    const dialogo = screen.getByRole("alertdialog", {
      name: "Excluir paciente",
    });
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveAccessibleDescription(/Excluir Ana Beatriz\?/);
  });

  it("abre com o foco em Cancelar", () => {
    abrir();

    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });

  it("Esc cancela sem confirmar", () => {
    const { onCancel, onConfirm } = abrir();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Tab circula só entre os botões da confirmação", () => {
    abrir();
    const cancelar = screen.getByRole("button", { name: "Cancelar" });
    const excluir = screen.getByRole("button", { name: "Excluir" });

    fireEvent.keyDown(window, { key: "Tab" });
    expect(excluir).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(cancelar).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(excluir).toHaveFocus();
  });

  it("fechado não renderiza nada", () => {
    abrir({ isOpen: false });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
