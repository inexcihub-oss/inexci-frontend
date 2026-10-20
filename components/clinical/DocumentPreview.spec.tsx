import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentPreview, sanitizeDocumentPreviewHtml } from "./DocumentPreview";

describe("DocumentPreview", () => {
  const host = () => screen.getByTestId("document-preview");

  it("renderiza o documento vindo do servidor", () => {
    render(
      <DocumentPreview html="<html><body><h1>RECEITUÁRIO</h1></body></html>" />,
    );

    expect(host().shadowRoot?.textContent).toContain("RECEITUÁRIO");
  });

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

  it("remove formulário, campos, iframe e tags de cabeçalho ativas", () => {
    render(
      <DocumentPreview
        html={'<html><head><meta http-equiv="refresh" content="0;url=https://x"><base href="https://x/"><link rel="stylesheet" href="https://x/a.css"><style>p{color:red}</style></head><body><p>ok</p><form action="https://x"><input name="senha"><textarea></textarea><select><option>a</option></select><button>Enviar</button></form><iframe src="https://x"></iframe><object data="x"></object><embed src="x"></body></html>'}
      />,
    );

    const root = host().shadowRoot!;
    for (const tag of [
      "form",
      "input",
      "textarea",
      "select",
      "button",
      "iframe",
      "object",
      "embed",
      "link",
      "meta",
      "base",
    ]) {
      expect(root.querySelector(tag)).toBeNull();
    }
    expect(root.querySelector("style")).not.toBeNull();
    expect(root.textContent).toContain("ok");
  });

  it("remove atributos de evento e mantém o style inline", () => {
    const html = sanitizeDocumentPreviewHtml(
      '<body><img src="x" onerror="alert(1)"><p style="color:red" onclick="alert(2)">ok</p></body>',
    );

    expect(html).not.toContain("onerror");
    expect(html).not.toContain("onclick");
    expect(html).toContain('style="color:red"');
  });
});
