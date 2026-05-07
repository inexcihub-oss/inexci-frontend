"use client";

import { useMemo } from "react";

/**
 * Renderizador minimalista de markdown.
 *
 * Suporta apenas o subconjunto necessário para os documentos legais
 * publicados em `/inexci-api/src/shared/legal/`:
 *  - cabeçalhos `#`, `##`, `###`
 *  - listas `-` e `*`
 *  - listas numeradas `1.`, `2.`...
 *  - ênfase `**negrito**`
 *  - links `[texto](url)`
 *  - parágrafos
 *  - blocos de código `\`\`\``
 *
 * Foi escrito sem dependências externas porque o projeto não tem
 * `react-markdown` instalado e estes termos são de baixa complexidade.
 */
export function MarkdownContent({ source }: { source: string }) {
  const blocks = useMemo(() => parseBlocks(source), [source]);

  return (
    <div className="prose prose-sm md:prose-base max-w-none text-gray-700 leading-relaxed">
      {blocks.map((block, idx) => renderBlock(block, idx))}
    </div>
  );
}

interface Block {
  type:
    | "heading"
    | "paragraph"
    | "ul"
    | "ol"
    | "code"
    | "hr"
    | "blockquote"
    | "blank";
  level?: number;
  text?: string;
  items?: string[];
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: "code", text: codeLines.join("\n") });
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      const match = line.match(/^(#{1,3})\s+(.*)$/);
      if (match) {
        blocks.push({
          type: "heading",
          level: match[1].length,
          text: match[2],
        });
      }
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    if (line.trim() === "") {
      blocks.push({ type: "blank" });
      i++;
      continue;
    }

    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !lines[i].startsWith("```") &&
      !/^---+\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join(" ") });
  }

  return blocks;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/;
  const boldRe = /\*\*([^*]+)\*\*/;
  const codeRe = /`([^`]+)`/;

  while (remaining.length > 0) {
    const linkM = remaining.match(linkRe);
    const boldM = remaining.match(boldRe);
    const codeM = remaining.match(codeRe);

    const candidates = [
      { match: linkM, kind: "link" },
      { match: boldM, kind: "bold" },
      { match: codeM, kind: "code" },
    ].filter((c) => c.match) as Array<{
      match: RegExpMatchArray;
      kind: string;
    }>;

    if (candidates.length === 0) {
      parts.push(remaining);
      break;
    }

    candidates.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));
    const next = candidates[0];
    const start = next.match.index ?? 0;

    if (start > 0) parts.push(remaining.slice(0, start));

    if (next.kind === "link") {
      parts.push(
        <a
          key={`l-${key++}`}
          href={next.match[2]}
          target={next.match[2].startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="text-primary-700 hover:underline"
        >
          {next.match[1]}
        </a>,
      );
    } else if (next.kind === "bold") {
      parts.push(
        <strong key={`b-${key++}`} className="font-semibold text-gray-900">
          {next.match[1]}
        </strong>,
      );
    } else if (next.kind === "code") {
      parts.push(
        <code
          key={`c-${key++}`}
          className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono"
        >
          {next.match[1]}
        </code>,
      );
    }

    remaining = remaining.slice(start + next.match[0].length);
  }

  return parts;
}

function renderBlock(block: Block, idx: number): React.ReactNode {
  switch (block.type) {
    case "heading": {
      const level = block.level ?? 1;
      const text = block.text ?? "";
      const cls =
        level === 1
          ? "text-2xl font-bold text-gray-900 mt-6 mb-3"
          : level === 2
            ? "text-xl font-semibold text-gray-900 mt-5 mb-2"
            : "text-lg font-semibold text-gray-900 mt-4 mb-2";
      if (level === 1)
        return (
          <h1 key={idx} className={cls}>
            {renderInline(text)}
          </h1>
        );
      if (level === 2)
        return (
          <h2 key={idx} className={cls}>
            {renderInline(text)}
          </h2>
        );
      return (
        <h3 key={idx} className={cls}>
          {renderInline(text)}
        </h3>
      );
    }
    case "paragraph":
      return (
        <p key={idx} className="my-3">
          {renderInline(block.text ?? "")}
        </p>
      );
    case "ul":
      return (
        <ul key={idx} className="list-disc pl-6 my-3 space-y-1">
          {(block.items ?? []).map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={idx} className="list-decimal pl-6 my-3 space-y-1">
          {(block.items ?? []).map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ol>
      );
    case "code":
      return (
        <pre
          key={idx}
          className="my-3 p-4 bg-gray-50 border border-gray-100 rounded-xl overflow-x-auto text-xs font-mono whitespace-pre-wrap"
        >
          {block.text}
        </pre>
      );
    case "blockquote":
      return (
        <blockquote
          key={idx}
          className="my-3 pl-4 border-l-4 border-primary-200 text-gray-600 italic"
        >
          {renderInline(block.text ?? "")}
        </blockquote>
      );
    case "hr":
      return <hr key={idx} className="my-6 border-gray-200" />;
    case "blank":
      return null;
    default:
      return null;
  }
}
