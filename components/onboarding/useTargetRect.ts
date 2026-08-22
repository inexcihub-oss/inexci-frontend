"use client";

import { useEffect, useState } from "react";

const TIMEOUT_PADRAO_MS = 3000;
const INTERVALO_BUSCA_MS = 100;
/** Passo cujo alvo só aparece depois de uma ação do usuário (abrir um modal). */
export const TIMEOUT_AGUARDA_ACAO_MS = 20000;

export type EstadoAlvo = "buscando" | "encontrado" | "ausente";

/**
 * Acompanha o retângulo do elemento `[data-tour="<target>"]`.
 *
 * Espera o alvo aparecer (a navegação de um passo com `route` é assíncrona) e
 * desiste depois do timeout. Desistir importa: alvos somem por motivos
 * rotineiros — lista vazia, viewport mobile onde a sidebar é drawer, permissão
 * parcial — e sem o teto o overlay giraria para sempre.
 */
export function useTargetRect(
  target: string | undefined,
  opts?: { timeoutMs?: number },
): { rect: DOMRect | null; estado: EstadoAlvo } {
  const timeoutMs = opts?.timeoutMs ?? TIMEOUT_PADRAO_MS;
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [estado, setEstado] = useState<EstadoAlvo>(
    target ? "buscando" : "ausente",
  );

  useEffect(() => {
    if (!target) {
      setRect(null);
      setEstado("ausente");
      return;
    }

    setEstado("buscando");
    setRect(null);

    let elemento: HTMLElement | null = null;
    let observer: ResizeObserver | null = null;
    let mutacoes: MutationObserver | null = null;
    let intervalo: ReturnType<typeof setInterval> | null = null;
    let limite: ReturnType<typeof setTimeout> | null = null;
    let cancelado = false;

    // Declarada antes de `medir` para não depender de hoisting: `medir`
    // reinicia a busca chamando `procurar` quando o alvo some do DOM.
    const procurar = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-tour="${target}"]`,
      );
      if (el) fixar(el);
    };

    const medir = () => {
      if (!elemento || cancelado) return;
      // Um alvo dentro de modal desaparece quando o usuário fecha o modal. Sem
      // esta verificação o holofote fica preso no retângulo antigo, iluminando
      // um pedaço vazio da tela — o `ResizeObserver` não dispara para elemento
      // já removido do documento.
      if (!document.contains(elemento)) {
        observer?.disconnect();
        observer = null;
        mutacoes?.disconnect();
        mutacoes = null;
        window.removeEventListener("scroll", medir, true);
        window.removeEventListener("resize", medir);
        elemento = null;
        setRect(null);
        setEstado("buscando");
        if (!intervalo) intervalo = setInterval(procurar, INTERVALO_BUSCA_MS);
        return;
      }
      setRect(elemento.getBoundingClientRect());
    };

    const parar = () => {
      if (intervalo) clearInterval(intervalo);
      intervalo = null;
    };

    const fixar = (el: HTMLElement) => {
      elemento = el;
      parar();
      if (limite) clearTimeout(limite);
      limite = null;

      el.scrollIntoView({ block: "center", behavior: "smooth" });
      medir();
      setEstado("encontrado");

      observer = new ResizeObserver(medir);
      observer.observe(el);
      // Captura: containers roláveis internos (o `main` no mobile, o kanban na
      // horizontal) não borbulham `scroll`.
      window.addEventListener("scroll", medir, true);
      window.addEventListener("resize", medir);

      // Só `childList`+`subtree`: é a remoção do nó que interessa, e um
      // observer de atributos no body inteiro seria caro.
      mutacoes = new MutationObserver(() => medir());
      mutacoes.observe(document.body, { childList: true, subtree: true });
    };

    procurar();
    if (!elemento) {
      intervalo = setInterval(procurar, INTERVALO_BUSCA_MS);
      limite = setTimeout(() => {
        parar();
        if (!cancelado) {
          setRect(null);
          setEstado("ausente");
        }
      }, timeoutMs);
    }

    return () => {
      cancelado = true;
      parar();
      if (limite) clearTimeout(limite);
      observer?.disconnect();
      mutacoes?.disconnect();
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [target, timeoutMs]);

  return { rect, estado };
}
