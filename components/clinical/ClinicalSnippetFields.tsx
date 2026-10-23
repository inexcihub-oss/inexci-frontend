"use client";

import Input from "@/components/ui/Input";
import {
  normalizarAtalho,
  SNIPPET_SHORTCUT_PATTERN,
} from "@/services/clinical-snippet.service";

export interface SnippetCampos {
  shortcut: string;
  title: string;
}

export function validarCamposSnippet(campos: SnippetCampos): string | null {
  const atalho = normalizarAtalho(campos.shortcut);
  if (!atalho) return "Informe o atalho.";
  if (!SNIPPET_SHORTCUT_PATTERN.test(atalho))
    return "Use só letras sem acento, números e hífen no atalho.";
  if (!campos.title.trim()) return "Informe o título.";
  return null;
}

export function ClinicalSnippetFields({
  campos,
  onChange,
  idPrefix,
}: {
  campos: SnippetCampos;
  onChange: (campos: SnippetCampos) => void;
  idPrefix: string;
}) {
  const atalho = normalizarAtalho(campos.shortcut);
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-1">
        <Input
          id={`${idPrefix}-atalho`}
          label="Atalho"
          value={campos.shortcut}
          maxLength={40}
          autoComplete="off"
          placeholder="normal"
          onChange={(e) => onChange({ ...campos, shortcut: e.target.value })}
        />
        <p className="text-xs text-neutral-500">
          Na ficha, digite <span className="font-semibold">/{atalho || "atalho"}</span>
        </p>
      </div>
      <Input
        id={`${idPrefix}-titulo`}
        label="Título"
        value={campos.title}
        maxLength={100}
        placeholder="Exame físico normal"
        onChange={(e) => onChange({ ...campos, title: e.target.value })}
      />
    </div>
  );
}
