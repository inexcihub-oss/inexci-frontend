import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";

vi.mock("@/components/shared/RichTextEditor", () => ({
  RichTextEditor: ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (v: string) => void;
    ariaLabel?: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/services/clinical-snippet.service", async (original) => ({
  ...(await original<typeof import("@/services/clinical-snippet.service")>()),
  clinicalSnippetService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { clinicalSnippetService } from "@/services/clinical-snippet.service";
import { ClinicalSnippetsSettings } from "./ClinicalSnippetsSettings";

const existente = {
  id: "s1",
  doctorId: "d-1",
  shortcut: "normal",
  title: "Exame físico normal",
  content: "<p>Bom estado geral.</p>",
  usageCount: 2,
  createdAt: "",
  updatedAt: "",
};

describe("ClinicalSnippetsSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clinicalSnippetService.getAll).mockResolvedValue([existente]);
  });

  it("lista os textos do próprio médico", async () => {
    renderWithProviders(<ClinicalSnippetsSettings userId="d-1" />);

    expect(await screen.findByText("/normal")).toBeInTheDocument();
    expect(screen.getByText("Exame físico normal")).toBeInTheDocument();
    expect(clinicalSnippetService.getAll).toHaveBeenCalledWith();
  });

  it("cria um texto novo exigindo o texto", async () => {
    const user = userEvent.setup();
    vi.mocked(clinicalSnippetService.create).mockResolvedValue(existente);
    renderWithProviders(<ClinicalSnippetsSettings userId="d-1" />);
    await screen.findByText("/normal");

    await user.click(screen.getByRole("button", { name: /Novo texto rápido/ }));
    await user.type(screen.getByLabelText("Atalho"), "joelho");
    await user.type(screen.getByLabelText("Título"), "Joelho normal");
    await user.click(
      screen.getByRole("button", { name: "Salvar texto rápido" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Escreva o texto.");

    await user.type(
      screen.getByLabelText("Texto do texto rápido"),
      "Sem derrame",
    );
    await user.click(
      screen.getByRole("button", { name: "Salvar texto rápido" }),
    );

    await waitFor(() =>
      expect(clinicalSnippetService.create).toHaveBeenCalledWith({
        shortcut: "joelho",
        title: "Joelho normal",
        content: "Sem derrame",
      }),
    );
  });

  it("edita e exclui", async () => {
    const user = userEvent.setup();
    vi.mocked(clinicalSnippetService.update).mockResolvedValue(existente);
    vi.mocked(clinicalSnippetService.delete).mockResolvedValue();
    renderWithProviders(<ClinicalSnippetsSettings userId="d-1" />);

    await user.click(await screen.findByRole("button", { name: "Editar /normal" }));
    const titulo = screen.getByLabelText("Título");
    await user.clear(titulo);
    await user.type(titulo, "Normal");
    await user.click(
      screen.getByRole("button", { name: "Salvar texto rápido" }),
    );
    await waitFor(() =>
      expect(clinicalSnippetService.update).toHaveBeenCalledWith("s1", {
        shortcut: "normal",
        title: "Normal",
        content: "<p>Bom estado geral.</p>",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Excluir /normal" }));
    await user.click(
      await screen.findByRole("button", { name: /^Excluir$|Confirmar|Remover/ }),
    );
    await waitFor(() =>
      expect(clinicalSnippetService.delete).toHaveBeenCalledWith("s1"),
    );
  });
});
