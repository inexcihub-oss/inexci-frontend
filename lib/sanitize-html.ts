import DOMPurify from "isomorphic-dompurify";

/**
 * Tags que o perfil html do DOMPurify aceita mas que nenhum editor da
 * plataforma (Tiptap) produz. Num texto clínico ou de laudo só serviriam para
 * montar um formulário falso dentro da página ou reestilizar a tela inteira
 * (`<style>` vale para o documento todo, não só para o trecho).
 */
const TAGS_PROIBIDAS = [
  "style",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "option",
  "optgroup",
  "fieldset",
  "datalist",
  "output",
];

/**
 * Sanitiza HTML para uso seguro em `dangerouslySetInnerHTML`.
 * Usa isomorphic-dompurify, que funciona tanto em SSR (Node.js) quanto no browser.
 * O atributo `style` continua permitido: o Tiptap grava alinhamento, cor e
 * fonte nele.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: TAGS_PROIBIDAS,
  });
}
