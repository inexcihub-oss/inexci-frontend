"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useAnchoredDropdown } from "@/hooks/useAnchoredDropdown";
import {
  Activity,
  MentionableUser,
  surgeryRequestService,
} from "@/services/surgery-request.service";

interface ActivityComposerProps {
  surgeryRequestId: string;
  onSent: (activity: Activity) => void;
}

/** Token de menção aberto imediatamente antes do cursor. */
const PADRAO_MENCAO = /(?:^|\s)@([^@\s]{0,40})$/;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Campo de comentário da aba Atividades, com menção por @.
 *
 * O texto enviado é legível ("@Dr. Bruno confere?"); os ids viajam à parte,
 * reconciliados no envio pelo nome ainda presente no texto — quem apagou a
 * menção antes de enviar não notifica ninguém.
 *
 * No mobile o campo fica no rodapé de um bottom-sheet, por isso a lista usa
 * `placement: "auto"` (abre para cima quando não cabe abaixo) e vai em portal:
 * `absolute` seria cortado pelo corpo rolável da folha.
 */
export function ActivityComposer({
  surgeryRequestId,
  onSent,
}: ActivityComposerProps) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [usuarios, setUsuarios] = useState<MentionableUser[]>([]);
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const escolhidosRef = useRef(new Map<string, MentionableUser>());

  const { anchorRef, dropdownRef, position } = useAnchoredDropdown(
    aberto,
    () => setAberto(false),
    { placement: "auto" },
  );

  useEffect(() => {
    let ativo = true;
    surgeryRequestService
      .getMentionableUsers(surgeryRequestId)
      .then((lista) => ativo && setUsuarios(lista))
      .catch(() => ativo && setUsuarios([]));
    return () => {
      ativo = false;
    };
  }, [surgeryRequestId]);

  const filtrados = usuarios.filter((u) =>
    normalizar(u.name).includes(normalizar(termo)),
  );

  const aoDigitar = (valor: string, cursor: number) => {
    setTexto(valor);
    const match = valor.slice(0, cursor).match(PADRAO_MENCAO);
    if (match) {
      setTermo(match[1]);
      setIndiceAtivo(0);
      setAberto(true);
    } else {
      setAberto(false);
    }
  };

  const escolher = useCallback(
    (usuario: MentionableUser) => {
      const input = inputRef.current;
      const cursor = input?.selectionStart ?? texto.length;
      const antes = texto.slice(0, cursor);
      const depois = texto.slice(cursor);
      const semToken = antes.replace(PADRAO_MENCAO, (trecho) =>
        trecho.startsWith(" ") ? " " : "",
      );

      escolhidosRef.current.set(usuario.id, usuario);
      setTexto(`${semToken}@${usuario.name} ${depois}`);
      setAberto(false);
      setTermo("");
      input?.focus();
    },
    [texto],
  );

  const idsMencionados = (conteudo: string): string[] =>
    [...escolhidosRef.current.values()]
      .filter((u) => conteudo.includes(`@${u.name}`))
      .map((u) => u.id);

  const enviar = async () => {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;

    setEnviando(true);
    try {
      const ids = idsMencionados(conteudo);
      const criada = await surgeryRequestService.createActivity(
        surgeryRequestId,
        conteudo,
        ids.length > 0 ? ids : undefined,
      );
      onSent(criada);
      setTexto("");
      escolhidosRef.current.clear();
    } catch {
      // Silencioso, como o fluxo anterior desta tela.
    } finally {
      setEnviando(false);
    }
  };

  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (aberto && filtrados.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndiceAtivo((i) => (i + 1) % filtrados.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndiceAtivo((i) => (i - 1 + filtrados.length) % filtrados.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        escolher(filtrados[indiceAtivo]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAberto(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void enviar();
    }
  };

  return (
    <div className="bg-white py-2 px-4 border-t border-neutral-100 flex-shrink-0 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      <div
        ref={anchorRef}
        className="flex items-center bg-white border border-neutral-100 gap-2 py-2.5 px-3.5 rounded-xl"
      >
        <input
          ref={inputRef}
          type="text"
          value={texto}
          onChange={(e) =>
            aoDigitar(e.target.value, e.target.selectionStart ?? 0)
          }
          onKeyDown={aoTeclar}
          placeholder="Escreva um comentário"
          disabled={enviando}
          role="combobox"
          aria-expanded={aberto}
          aria-controls="lista-mencoes"
          aria-autocomplete="list"
          // `ds-input-xs` neutraliza a regra global que força 16px em input
          // no mobile (anti-zoom do iOS): sem ela o texto digitado fica maior
          // que as mensagens já publicadas e que o mesmo campo no desktop.
          className="ds-input-xs flex-1 bg-transparent border-none outline-none text-xs text-gray-900 leading-snug disabled:opacity-50"
        />
        <button
          onClick={() => void enviar()}
          disabled={!texto.trim() || enviando}
          aria-label="Enviar comentário"
          className="w-6 h-6 flex-shrink-0 hover:opacity-70 transition-opacity disabled:opacity-30"
        >
          {enviando ? (
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Image src="/icons/send.svg" alt="" width={24} height={24} />
          )}
        </button>
      </div>

      {aberto &&
        filtrados.length > 0 &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            id="lista-mencoes"
            role="listbox"
            style={{
              position: "fixed",
              left: position.left,
              width: position.width,
              maxWidth: "calc(100vw - 32px)",
              zIndex: 9999,
              ...(position.placement === "top"
                ? { bottom: position.bottom + 8 }
                : { top: position.top + 8 }),
            }}
            className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto"
          >
            {filtrados.map((usuario, i) => (
              <button
                key={usuario.id}
                type="button"
                role="option"
                aria-selected={i === indiceAtivo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(usuario)}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 min-h-[44px] ${
                  i === indiceAtivo ? "bg-teal-50" : "hover:bg-gray-50"
                }`}
              >
                <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                  {usuario.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-gray-700 truncate">{usuario.name}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
