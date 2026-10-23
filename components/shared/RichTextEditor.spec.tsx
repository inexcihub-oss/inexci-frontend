import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  conteudoDoSnippet,
  filtrarSnippets,
  RichTextEditor,
} from "./RichTextEditor";

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

const SNIPPETS = [
  {
    id: "s1",
    shortcut: "normal",
    title: "Exame físico normal",
    content: "<p>Bom estado geral.</p>",
  },
  {
    id: "s2",
    shortcut: "joelho",
    title: "Joelho normal",
    content: "<p>Sem derrame.</p>",
  },
];

type EditorNoDom = Element & {
  editor: {
    commands: { insertContent: (c: string) => boolean; focus: () => boolean };
  };
};

async function editorReal(props: Partial<Parameters<typeof RichTextEditor>[0]>) {
  const onChange = vi.fn();
  const view = render(
    <RichTextEditor
      variant="clinical"
      value=""
      onChange={onChange}
      {...props}
    />,
  );
  await waitFor(() =>
    expect(view.container.querySelector(".ProseMirror")).not.toBeNull(),
  );
  const pm = view.container.querySelector(".ProseMirror") as EditorNoDom;
  return { ...view, pm, onChange };
}

describe("filtrarSnippets", () => {
  it("prioriza atalho que começa com o que foi digitado e busca no título", () => {
    expect(filtrarSnippets(SNIPPETS, "").map((s) => s.id)).toEqual([
      "s1",
      "s2",
    ]);
    expect(filtrarSnippets(SNIPPETS, "jo").map((s) => s.id)).toEqual(["s2"]);
    expect(filtrarSnippets(SNIPPETS, "fisico").map((s) => s.id)).toEqual([]);
    expect(filtrarSnippets(SNIPPETS, "exame").map((s) => s.id)).toEqual([
      "s1",
    ]);
  });
});

describe("conteudoDoSnippet", () => {
  it("insere na mesma linha quando o texto é um parágrafo só", () => {
    expect(conteudoDoSnippet("<p>Sem <strong>derrame</strong>.</p>")).toBe(
      "Sem <strong>derrame</strong>.",
    );
    expect(conteudoDoSnippet("<p>A</p><p>B</p>")).toBe("<p>A</p><p>B</p>");
    expect(conteudoDoSnippet("<ul><li><p>A</p></li></ul>")).toBe(
      "<ul><li><p>A</p></li></ul>",
    );
  });
});

describe("RichTextEditor — textos rápidos", () => {
  beforeAll(() => {
    const vazio = () =>
      Object.assign([], { item: () => null }) as unknown as DOMRectList;
    const retangulo = () =>
      ({
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    Range.prototype.getClientRects ??= vazio;
    Range.prototype.getBoundingClientRect ??= retangulo;
    Element.prototype.getClientRects ??= vazio;
  });

  it("abre o menu com / e insere o texto escolhido no lugar do atalho", async () => {
    const onSnippetUsed = vi.fn();
    const { pm, onChange } = await editorReal({
      snippets: SNIPPETS,
      onSnippetUsed,
    });

    pm.editor.commands.focus();
    pm.editor.commands.insertContent("Ao exame: /jo");

    const lista = await screen.findByRole("listbox", {
      name: "Textos rápidos",
    });
    expect(lista).toHaveTextContent("/joelho");
    expect(lista).not.toHaveTextContent("/normal");

    fireEvent.keyDown(pm, { key: "Enter" });

    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );
    expect(onSnippetUsed).toHaveBeenCalledWith("s2");
    const html = onChange.mock.calls.at(-1)?.[0] as string;
    expect(html).toBe("<p>Ao exame: Sem derrame.</p>");
  });

  it("Esc fecha o menu sem inserir nada", async () => {
    const onSnippetUsed = vi.fn();
    const { pm } = await editorReal({ snippets: SNIPPETS, onSnippetUsed });

    pm.editor.commands.focus();
    pm.editor.commands.insertContent("/");
    await screen.findByRole("listbox", { name: "Textos rápidos" });

    fireEvent.keyDown(pm, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );
    expect(onSnippetUsed).not.toHaveBeenCalled();
  });

  it("não abre com barra no meio de número (ex.: 12/8)", async () => {
    const { pm } = await editorReal({ snippets: SNIPPETS });

    pm.editor.commands.focus();
    pm.editor.commands.insertContent("PA 12/8");

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("explica como criar quando o médico ainda não tem textos", async () => {
    const { pm } = await editorReal({ snippets: [] });

    pm.editor.commands.focus();
    pm.editor.commands.insertContent("/");

    expect(
      await screen.findByText(/ainda não tem textos rápidos/),
    ).toBeInTheDocument();
  });

  it("não abre o menu em editor sem foco que recebe o texto de fora", async () => {
    const { rerender } = render(
      <RichTextEditor
        variant="clinical"
        value=""
        onChange={vi.fn()}
        snippets={SNIPPETS}
      />,
    );
    await waitFor(() =>
      expect(document.querySelector(".ProseMirror")).not.toBeNull(),
    );

    rerender(
      <RichTextEditor
        variant="clinical"
        value="<p>Ao exame: /</p>"
        onChange={vi.fn()}
        snippets={SNIPPETS}
      />,
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("sem a lista de textos, a barra não abre menu", async () => {
    const { pm } = await editorReal({});

    pm.editor.commands.focus();
    pm.editor.commands.insertContent("/");

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText("Textos rápidos")).not.toBeInTheDocument();
  });

  it("salvar seleção entrega o HTML do trecho selecionado", async () => {
    const onSaveSelection = vi.fn();
    const { pm } = await editorReal({
      value: "<p>Bom estado geral</p>",
      onSaveSelection,
    });
    const editor = (
      pm as unknown as {
        editor: {
          commands: { selectAll: () => boolean; focus: () => boolean };
        };
      }
    ).editor;

    editor.commands.focus();
    editor.commands.selectAll();
    fireEvent.mouseDown(
      await screen.findByTitle("Salvar seleção como texto rápido"),
    );

    expect(onSaveSelection).toHaveBeenCalledWith("<p>Bom estado geral</p>");
  });
});
