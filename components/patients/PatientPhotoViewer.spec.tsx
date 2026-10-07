import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PatientPhotoViewer } from "./PatientPhotoViewer";

describe("PatientPhotoViewer", () => {
  it("mostra a foto ampliada com o nome e foca o botão de fechar", () => {
    render(
      <PatientPhotoViewer src="https://r2/foto.webp" nome="Ana Souza" onClose={vi.fn()} />,
    );
    expect(screen.getByRole("dialog", { name: "Foto de Ana Souza" })).toBeInTheDocument();
    expect(screen.getByAltText("Foto de Ana Souza")).toHaveAttribute("src", "https://r2/foto.webp");
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar foto" })).toHaveFocus();
  });

  it("fecha no X, no Esc e clicando fora — mas não clicando na foto", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PatientPhotoViewer src="x" nome="Ana" onClose={onClose} />);

    await user.click(screen.getByAltText("Foto de Ana"));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Fechar foto" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("trava a rolagem da página enquanto aberto e devolve ao fechar", () => {
    const { unmount } = render(<PatientPhotoViewer src="x" nome="Ana" onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("mostra as ações quando passadas", () => {
    render(
      <PatientPhotoViewer
        src="x"
        nome="Ana"
        onClose={vi.fn()}
        acoes={<button type="button">Trocar foto</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Trocar foto" })).toBeInTheDocument();
  });
});
