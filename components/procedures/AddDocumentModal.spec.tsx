import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddDocumentModal } from "./AddDocumentModal";

describe("AddDocumentModal", () => {
  it("escolhe o tipo na lista (em portal) e adiciona", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onClose = vi.fn();
    render(<AddDocumentModal isOpen onClose={onClose} onAdd={onAdd} />);

    expect(
      screen.getByRole("dialog", { name: "Adicionar documento ou exame" }),
    ).toBeInTheDocument();
    const adicionar = screen.getByRole("button", { name: "Adicionar" });
    expect(adicionar).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Selecione o tipo/ }));
    await user.click(screen.getByRole("button", { name: "Exames" }));
    await user.type(
      screen.getByPlaceholderText("Ex: Ressonância do Joelho"),
      "RM joelho",
    );
    await user.click(adicionar);

    expect(onAdd).toHaveBeenCalledWith({ type: "Exames", name: "RM joelho" });
    expect(onClose).toHaveBeenCalled();
  });

  it("Esc cancela", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddDocumentModal isOpen onClose={onClose} onAdd={vi.fn()} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
