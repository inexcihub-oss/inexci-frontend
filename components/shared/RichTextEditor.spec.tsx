import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
