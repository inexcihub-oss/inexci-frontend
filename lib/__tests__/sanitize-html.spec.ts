import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../sanitize-html";

describe("sanitizeHtml", () => {
  it("mantém a formatação que o Tiptap grava", () => {
    const html =
      '<p style="text-align: center"><strong>Dor</strong> <em>lombar</em> <u>há</u> 3 dias</p><ul><li>item</li></ul><mark>destaque</mark>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("remove script e handlers", () => {
    const limpo = sanitizeHtml(
      '<p onclick="alert(1)">a</p><script>alert(1)</script><img src="x" onerror="alert(1)">',
    );
    expect(limpo).not.toMatch(/script|onclick|onerror/);
  });

  it("remove <style>, que reestilizaria a página inteira", () => {
    const limpo = sanitizeHtml("<style>body{display:none}</style><p>texto</p>");
    expect(limpo).toBe("<p>texto</p>");
  });

  it("remove formulário e campos (formulário falso dentro do prontuário)", () => {
    const limpo = sanitizeHtml(
      '<form action="https://mal.example"><input name="senha" type="password"><textarea></textarea><select><option>a</option></select><button>Entrar</button></form><p>ok</p>',
    );
    expect(limpo).not.toMatch(/<(form|input|textarea|select|option|button)/);
    expect(limpo).toContain("<p>ok</p>");
  });

  it("remove link javascript:", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(
      /javascript:/,
    );
  });
});
