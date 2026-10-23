"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import {
  ClinicalSnippetFields,
  validarCamposSnippet,
} from "@/components/clinical/ClinicalSnippetFields";
import { temTexto } from "@/components/clinical/AtendimentoFicha";
import { useClinicalSnippets } from "@/hooks/useClinicalSnippets";
import { getApiErrorMessage } from "@/lib/http-error";
import { clinicalSnippetKeys } from "@/lib/query-keys";
import {
  clinicalSnippetService,
  normalizarAtalho,
  type ClinicalSnippet,
} from "@/services/clinical-snippet.service";

const RichTextEditor = dynamic(
  () =>
    import("@/components/shared/RichTextEditor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="min-h-[140px]" /> },
);

interface Rascunho {
  id: string | null;
  shortcut: string;
  title: string;
  content: string;
}

export function ClinicalSnippetsSettings({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { data: snippets = [], isLoading } = useClinicalSnippets(userId);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<ClinicalSnippet | null>(null);
  const [apagando, setApagando] = useState(false);

  const recarregar = () =>
    queryClient.invalidateQueries({ queryKey: clinicalSnippetKeys.all });

  const salvar = async () => {
    if (!rascunho) return;
    const invalido =
      validarCamposSnippet(rascunho) ??
      (temTexto(rascunho.content) ? null : "Escreva o texto.");
    if (invalido) {
      setErro(invalido);
      return;
    }
    setErro(null);
    setSalvando(true);
    const payload = {
      shortcut: normalizarAtalho(rascunho.shortcut),
      title: rascunho.title.trim(),
      content: rascunho.content,
    };
    try {
      if (rascunho.id) {
        await clinicalSnippetService.update(rascunho.id, payload);
      } else {
        await clinicalSnippetService.create(payload);
      }
      setRascunho(null);
      await recarregar();
    } catch (err) {
      setErro(getApiErrorMessage(err, "Não foi possível salvar o texto."));
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!excluindo) return;
    setApagando(true);
    try {
      await clinicalSnippetService.delete(excluindo.id);
      setExcluindo(null);
      await recarregar();
    } catch (err) {
      setErro(getApiErrorMessage(err, "Não foi possível excluir o texto."));
      setExcluindo(null);
    } finally {
      setApagando(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Textos rápidos
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Frases que você usa sempre na ficha. No atendimento, digite{" "}
            <span className="font-semibold text-gray-700">/</span> seguido do
            atalho para inserir o texto onde está o cursor.
          </p>
        </div>
        {!rascunho && (
          <Button
            variant="outline"
            className="min-h-[44px] shrink-0"
            onClick={() => {
              setErro(null);
              setRascunho({ id: null, shortcut: "", title: "", content: "" });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo texto rápido
          </Button>
        )}
      </div>

      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}

      {rascunho && (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4">
          <ClinicalSnippetFields
            campos={rascunho}
            onChange={(campos) => setRascunho({ ...rascunho, ...campos })}
            idPrefix="texto-rapido"
          />
          <div className="flex flex-col gap-1.5">
            <span className="ds-label">Texto</span>
            <div className="rounded-xl border border-gray-200 px-3 py-2">
              <RichTextEditor
                variant="clinical"
                value={rascunho.content}
                onChange={(content) => setRascunho({ ...rascunho, content })}
                placeholder="Ex.: Bom estado geral, corado, hidratado, eupneico..."
                ariaLabel="Texto do texto rápido"
                minHeight="120px"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              className="min-h-[44px]"
              disabled={salvando}
              onClick={() => {
                setRascunho(null);
                setErro(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              className="min-h-[44px]"
              disabled={salvando}
              onClick={salvar}
            >
              {salvando ? "Salvando..." : "Salvar texto rápido"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando textos rápidos...</p>
      ) : snippets.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nenhum texto rápido ainda. Você também pode criar um direto na ficha:
          selecione o trecho e use o botão de salvar na barra de formatação.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100">
          {snippets.map((snippet) => (
            <li
              key={snippet.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Zap
                  className="w-4 h-4 text-teal-600 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-gray-900">
                  /{snippet.shortcut}
                </span>
                <span className="text-sm text-gray-600 truncate">
                  {snippet.title}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={`Editar /${snippet.shortcut}`}
                  onClick={() => {
                    setErro(null);
                    setRascunho({
                      id: snippet.id,
                      shortcut: snippet.shortcut,
                      title: snippet.title,
                      content: snippet.content,
                    });
                  }}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Excluir /${snippet.shortcut}`}
                  onClick={() => setExcluindo(snippet)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDeleteModal
        isOpen={excluindo !== null}
        title="Excluir texto rápido"
        itemName={excluindo ? `/${excluindo.shortcut}` : undefined}
        softDelete
        loading={apagando}
        onConfirm={excluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
