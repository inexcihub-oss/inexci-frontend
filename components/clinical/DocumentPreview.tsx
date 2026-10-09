"use client";

import { useEffect, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";

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
