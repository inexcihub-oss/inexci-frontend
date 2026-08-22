import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DoctorHeaderEditor } from "@/components/shared/DoctorHeaderEditor";

/**
 * Prova que o editor de cabeçalho carrega as âncoras `data-tour` que a
 * trilha `documentos-do-medico` (`lib/onboarding/tour-registry.ts`) espera
 * encontrar: "config-header-logo", "config-header-texto" e
 * "config-header-previa". Sem este teste, remover o atributo (ou trocar o
 * elemento) quebra o tour em silêncio.
 */

vi.mock("@/components/shared/RichTextEditor", () => ({
  RichTextEditor: () => <div data-testid="rich-text-editor" />,
}));

function props() {
  return {
    loading: false,
    saving: false,
    currentHeader: null,
    logoPreview: null,
    logoPosition: "left" as const,
    contentHtml: "",
    logoInputRef: createRef<HTMLInputElement>(),
    onLogoChange: vi.fn(),
    onDeleteLogo: vi.fn(),
    onLogoPositionChange: vi.fn(),
    onContentHtmlChange: vi.fn(),
    onSave: vi.fn(),
    onDeleteHeader: vi.fn(),
  };
}

describe("DoctorHeaderEditor — âncoras do tour", () => {
  it("expõe as âncoras data-tour das três seções do cabeçalho", () => {
    render(<DoctorHeaderEditor {...props()} contentHtml="<p>Dr. Teste</p>" />);

    expect(
      screen
        .getByText("Logo do Cabeçalho")
        .closest('[data-tour="config-header-logo"]'),
    ).not.toBeNull();
    expect(
      screen
        .getByText("Texto do Cabeçalho")
        .closest('[data-tour="config-header-texto"]'),
    ).not.toBeNull();
    expect(
      screen
        .getByText("Pré-visualização")
        .closest('[data-tour="config-header-previa"]'),
    ).not.toBeNull();
  });
});
