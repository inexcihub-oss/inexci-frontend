import DOMPurify from "isomorphic-dompurify";

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

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: TAGS_PROIBIDAS,
  });
}
