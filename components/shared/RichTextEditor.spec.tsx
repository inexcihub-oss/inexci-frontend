import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RichTextEditor } from "./RichTextEditor";

describe("RichTextEditor — extensões", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("não registra o Underline em duplicidade (StarterKit v3 já o inclui)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<RichTextEditor value="<p>texto</p>" onChange={vi.fn()} />);
    await screen.findByTitle("Sublinhado");

    const duplicadas = warn.mock.calls.filter((args) =>
      args.some((a) => String(a).includes("Duplicate extension names")),
    );
    expect(duplicadas).toEqual([]);
  });

  it("mantém o sublinhado: <u> do conteúdo é preservado no editor", async () => {
    const { container } = render(
      <RichTextEditor value="<p><u>sublinhado</u></p>" onChange={vi.fn()} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".ProseMirror u")).not.toBeNull();
    });
    expect(container.querySelector(".ProseMirror u")).toHaveTextContent(
      "sublinhado",
    );
  });
});

describe("RichTextEditor — variante clínica", () => {
  it("mostra só a formatação essencial", async () => {
    render(
      <RichTextEditor variant="clinical" value="" onChange={vi.fn()} />,
    );

    await screen.findByTitle("Negrito");
    for (const titulo of [
      "Itálico",
      "Sublinhado",
      "Lista",
      "Lista numerada",
      "Realçar",
      "Remover formatação",
    ]) {
      expect(screen.getByTitle(titulo)).toBeInTheDocument();
    }
    for (const titulo of [
      "Fonte",
      "Tamanho da fonte",
      "Cor do texto",
      "Centralizar",
      "Justificar",
    ]) {
      expect(screen.queryByTitle(titulo)).not.toBeInTheDocument();
    }
  });

  it("a variante completa continua com fonte, cor e alinhamento", async () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);

    expect(await screen.findByTitle("Fonte")).toBeInTheDocument();
    expect(screen.getByTitle("Cor do texto")).toBeInTheDocument();
    expect(screen.getByTitle("Centralizar")).toBeInTheDocument();
  });

  it("renderiza a barra no espaço indicado pela ficha", async () => {
    const slot = document.createElement("div");
    document.body.appendChild(slot);
    render(
      <RichTextEditor
        variant="clinical"
        value=""
        onChange={vi.fn()}
        toolbarSlot={slot}
      />,
    );

    await waitFor(() =>
      expect(slot.querySelector('[title="Negrito"]')).not.toBeNull(),
    );
    slot.remove();
  });

  it("descarta fonte, tamanho e cor de texto colado de outro sistema", async () => {
    const { container } = render(
      <RichTextEditor
        variant="clinical"
        value='<p><span style="color: #ff0000; font-size: 22px; font-family: Arial">Dor</span> <strong>forte</strong></p>'
        onChange={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(container.querySelector(".ProseMirror strong")).not.toBeNull(),
    );
    const editor = container.querySelector(".ProseMirror")!;
    expect(editor).toHaveTextContent("Dor forte");
    expect(editor.querySelector("[style]")).toBeNull();
  });

  it("expõe o editor como caixa de texto com o nome da seção", async () => {
    render(
      <RichTextEditor
        variant="clinical"
        value=""
        onChange={vi.fn()}
        ariaLabel="Anamnese"
      />,
    );

    expect(
      await screen.findByRole("textbox", { name: "Anamnese" }),
    ).toBeInTheDocument();
  });
});

describe("RichTextEditor — Enter", () => {
  it.each(["full", "clinical"] as const)(
    "cria um novo parágrafo na variante %s",
    async (variant) => {
      const onChange = vi.fn();
      const erro = vi.spyOn(console, "error").mockImplementation(() => {});
      const { container } = render(
        <RichTextEditor
          variant={variant}
          value="<p>Dor lombar</p>"
          onChange={onChange}
        />,
      );

      await waitFor(() =>
        expect(container.querySelector(".ProseMirror")).not.toBeNull(),
      );
      fireEvent.keyDown(container.querySelector(".ProseMirror")!, {
        key: "Enter",
      });

      await waitFor(() =>
        expect(container.querySelectorAll(".ProseMirror p")).toHaveLength(2),
      );
      expect(onChange).toHaveBeenLastCalledWith(
        expect.stringMatching(/<p>.*<\/p><p>.*<\/p>/),
      );
      expect(erro).not.toHaveBeenCalled();
      erro.mockRestore();
    },
  );
});
