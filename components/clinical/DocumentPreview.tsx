"use client";

import { useEffect, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";

/**
 * Exibe o HTML do documento (receita, atestado, solicitação de exames) do jeito
 * que ele será impresso.
 *
 * O conteúdo vai para um **shadow root**, não para a página: o template traz
 * `<style>` com regras para `body`, `*` e classes genéricas, que injetadas
 * direto reestilizariam o app inteiro. O shadow root também evita o `iframe`
 * com `blob:`, que a CSP do app bloqueia (`default-src 'self'`).
 */
export function DocumentPreview({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (!shadowRef.current) {
      shadowRef.current = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    }

    // O HTML é do nosso template, mas carrega texto livre digitado pelo médico:
    // sanitizar mantém a barreira mesmo se algo escapar do escape do Handlebars.
    // `style` é mantido de propósito — é o CSS do documento.
    shadowRef.current.innerHTML = DOMPurify.sanitize(html, {
      WHOLE_DOCUMENT: true,
      ADD_TAGS: ["style"],
      FORBID_TAGS: ["script", "iframe", "object", "embed"],
    });
  }, [html]);

  return (
    <div
      ref={hostRef}
      data-testid="document-preview"
      className={`bg-white ${className}`}
    />
  );
}
