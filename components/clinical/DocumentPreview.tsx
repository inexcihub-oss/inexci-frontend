"use client";

import { useEffect, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import { TAGS_PROIBIDAS } from "@/lib/sanitize-html";

const PREVIEW_FORBID_TAGS = [
  ...TAGS_PROIBIDAS.filter((tag) => tag !== "style"),
  "script",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "link",
  "meta",
  "base",
  "noscript",
  "template",
];

const PREVIEW_FORBID_ATTR = [
  "onerror",
  "onload",
  "onclick",
  "onmouseover",
  "onmouseenter",
  "onfocus",
  "onblur",
  "onanimationstart",
  "onanimationend",
  "ontransitionend",
  "onbegin",
  "srcdoc",
  "formaction",
  "action",
  "ping",
];

export function sanitizeDocumentPreviewHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ["style"],
    FORBID_TAGS: PREVIEW_FORBID_TAGS,
    FORBID_ATTR: PREVIEW_FORBID_ATTR,
  });
}

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

    shadowRef.current.innerHTML = sanitizeDocumentPreviewHtml(html);
  }, [html]);

  return (
    <div
      ref={hostRef}
      data-testid="document-preview"
      className={`bg-white ${className}`}
    />
  );
}
