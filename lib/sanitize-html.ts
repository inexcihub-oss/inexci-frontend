import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitiza HTML para uso seguro em `dangerouslySetInnerHTML`.
 * Usa isomorphic-dompurify, que funciona tanto em SSR (Node.js) quanto no browser.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}
