import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentPreview } from "./DocumentPreview";

describe("DocumentPreview", () => {
  const host = () => screen.getByTestId("document-preview");

  it("renderiza o documento vindo do servidor", () => {
    render(
      <DocumentPreview html="<html><body><h1>RECEITUÁRIO</h1></body></html>" />,
    );

    expect(host().shadowRoot?.textContent).toContain("RECEITUÁRIO");
  });

  // O template traz `<style>` com regras para `body`, `*` e classes genéricas.
  // Injetado na página, isso reestilizaria o app inteiro; no shadow root o
  // efeito para na borda da prévia.
  it("mantém o CSS do documento isolado da página", () => {
    render(
      <DocumentPreview html="<html><head><style>body{background:#000}</style></head><body><p>ok</p></body></html>" />,
    );

    expect(host().shadowRoot?.querySelector("style")).not.toBeNull();
    expect(document.head.querySelector("style[data-preview]")).toBeNull();
  });

  it("remove script vindo no HTML", () => {
    render(
      <DocumentPreview html="<body><p>ok</p><script>window.x=1</script></body>" />,
    );

    expect(host().shadowRoot?.querySelector("script")).toBeNull();
    expect(host().shadowRoot?.textContent).toContain("ok");
  });

  it("troca o conteúdo quando o HTML muda", () => {
    const { rerender } = render(<DocumentPreview html="<p>antes</p>" />);
    expect(host().shadowRoot?.textContent).toContain("antes");

    rerender(<DocumentPreview html="<p>depois</p>" />);

    expect(host().shadowRoot?.textContent).toContain("depois");
    expect(host().shadowRoot?.textContent).not.toContain("antes");
  });
});
