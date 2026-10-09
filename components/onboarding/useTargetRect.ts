"use client";

import { useEffect, useRef, useState } from "react";

const TIMEOUT_PADRAO_MS = 3000;
const INTERVALO_BUSCA_MS = 100;
const JANELA_REMEDICAO_ANIMACAO_MS = 400;
export const TIMEOUT_AGUARDA_ACAO_MS = 20000;

export type EstadoAlvo = "buscando" | "encontrado" | "ausente";

function movimentoReduzido(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useTargetRect(
  target: string | undefined,
  opts?: { timeoutMs?: number },
): { rect: DOMRect | null; estado: EstadoAlvo } {
  const timeoutMs = opts?.timeoutMs ?? TIMEOUT_PADRAO_MS;
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [estado, setEstado] = useState<EstadoAlvo>(
    target ? "buscando" : "ausente",
  );

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

    const procurar = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-tour="${target}"]`,
      );
      if (el) fixar(el);
    };

    const medir = () => {
      if (!elemento || cancelado) return;
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
      parar();

      el.scrollIntoView({
        block: "center",
        behavior: movimentoReduzido() ? "auto" : "smooth",
      });
      medir();
      setEstado("encontrado");

      const fimJanela = Date.now() + JANELA_REMEDICAO_ANIMACAO_MS;
      const remedirDuranteAnimacao = () => {
        if (cancelado || !elemento) return;
        medir();
        if (Date.now() < fimJanela) {
          requestAnimationFrame(remedirDuranteAnimacao);
        }
      };
      requestAnimationFrame(remedirDuranteAnimacao);

      observer = new ResizeObserver(medir);
      observer.observe(el);
      window.addEventListener("scroll", medir, true);
      window.addEventListener("resize", medir);

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
