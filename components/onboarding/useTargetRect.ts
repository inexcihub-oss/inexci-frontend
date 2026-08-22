"use client";

import { useEffect, useRef, useState } from "react";

const TIMEOUT_PADRAO_MS = 3000;
const INTERVALO_BUSCA_MS = 100;
/** Passo cujo alvo só aparece depois de uma ação do usuário (abrir um modal). */
export const TIMEOUT_AGUARDA_ACAO_MS = 20000;

export type EstadoAlvo = "buscando" | "encontrado" | "ausente";

/** `matchMedia` não existe em todo ambiente de teste — trate a ausência. */
function movimentoReduzido(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

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

  /**
   * Reset SÍNCRONO, durante o render — não dentro do efeito. Quando `target`
   * troca (o tour avança de passo), `estado` continua carregando o valor do
   * ALVO ANTERIOR até o efeito abaixo rodar. Bug real encontrado num teste
   * e2e: da trilha `solicitacoes`, o passo "requisitos" (sem alvo, `estado`
   * vira "ausente") é seguido por "por-documento" (com alvo já presente na
   * tela). No commit em que `indice` avança, o efeito de degradação do
   * `TourOverlay` — que roda no MESMO commit, reagindo a `estado ===
   * "ausente"` — ainda lia o "ausente" deixado pelo passo ANTERIOR, agora
   * combinado com o `target` do passo NOVO, e concluía (errado) que o alvo
   * novo não foi encontrado — fechando o tour antes mesmo de `procurar()`
   * rodar. O padrão "ajustar estado durante o render" (comparar com o valor
   * anterior guardado num ref e chamar `setState` no corpo da função) resolve
   * porque o React descarta este render e já refaz com o estado corrigido
   * ANTES de qualquer efeito — inclusive o desta própria função — disparar.
   */
  const targetAnteriorRef = useRef(target);
  if (targetAnteriorRef.current !== target) {
    targetAnteriorRef.current = target;
    setRect(null);
    setEstado(target ? "buscando" : "ausente");
  }

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
        reiniciarBusca();
        return;
      }
      setRect(elemento.getBoundingClientRect());
    };

    const parar = () => {
      if (intervalo) clearInterval(intervalo);
      intervalo = null;
      if (limite) clearTimeout(limite);
      limite = null;
    };

    // Rearma tanto o polling quanto o teto de desistência. Usada na busca
    // inicial e de novo quando um alvo já encontrado some do DOM (ex.: passo
    // `aguardaAcao` cujo modal foi fechado sem a ação ser concluída) — sem
    // rearmar o `limite` aqui, um alvo que aparece e some ficaria em
    // "buscando" para sempre, com o polling rodando até o componente
    // desmontar, contrariando o próprio motivo do timeout existir.
    const reiniciarBusca = () => {
      if (!intervalo) intervalo = setInterval(procurar, INTERVALO_BUSCA_MS);
      if (limite) clearTimeout(limite);
      limite = setTimeout(() => {
        parar();
        if (!cancelado) {
          setRect(null);
          setEstado("ausente");
        }
      }, timeoutMs);
    };

    const fixar = (el: HTMLElement) => {
      elemento = el;
      // `parar()` já limpa `intervalo` e `limite` — não repita a limpeza aqui.
      parar();

      el.scrollIntoView({
        block: "center",
        behavior: movimentoReduzido() ? "auto" : "smooth",
      });
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
    if (!elemento) reiniciarBusca();

    return () => {
      cancelado = true;
      parar();
      observer?.disconnect();
      mutacoes?.disconnect();
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [target, timeoutMs]);

  return { rect, estado };
}
