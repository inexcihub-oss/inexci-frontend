"use client";

import { Fragment } from "react";
import { ActivityMention } from "@/services/surgery-request.service";

interface ActivityContentProps {
  content: string;
  mentions?: ActivityMention[];
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function ActivityContent({ content, mentions }: ActivityContentProps) {
  const lista = mentions ?? [];

  if (lista.length === 0) {
    return (
      <p
        data-testid="activity-content"
        className="text-xs text-gray-600 leading-snug break-words"
      >
        {content}
      </p>
    );
  }

  const ordenadas = [...lista].sort((a, b) => b.name.length - a.name.length);
  const padrao = new RegExp(
    `@(${ordenadas.map((m) => escaparRegex(m.name)).join("|")})`,
    "g",
  );

  const partes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = padrao.exec(content)) !== null) {
    if (match.index > cursor) {
      partes.push(content.slice(cursor, match.index));
    }
    const nome = match[1];
    const mencionado = ordenadas.find((m) => m.name === nome);
    partes.push(
      <span
        key={`${match.index}-${nome}`}
        data-mention-id={mencionado?.id}
        className="text-teal-700 font-semibold"
      >
        {match[0]}
      </span>,
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < content.length) partes.push(content.slice(cursor));

  return (
    <p
      data-testid="activity-content"
      className="text-xs text-gray-600 leading-snug break-words"
    >
      {partes.map((parte, i) => (
        <Fragment key={i}>{parte}</Fragment>
      ))}
    </p>
  );
}
