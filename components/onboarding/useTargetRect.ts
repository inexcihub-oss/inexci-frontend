"use client";

import { useEffect, useState } from "react";

const TIMEOUT_PADRAO_MS = 3000;
const INTERVALO_BUSCA_MS = 100;

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
    let intervalo: ReturnType<typeof setInterval> | null = null;
    let limite: ReturnType<typeof setTimeout> | null = null;
    let cancelado = false;

    const medir = () => {
      if (!elemento || cancelado) return;
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

      // jsdom não implementa scrollIntoView; guarda para não quebrar os testes.
      el.scrollIntoView?.({ block: "center", behavior: "smooth" });
      medir();
      setEstado("encontrado");

      observer = new ResizeObserver(medir);
      observer.observe(el);
      // Captura: containers roláveis internos (o `main` no mobile, o kanban na
      // horizontal) não borbulham `scroll`.
      window.addEventListener("scroll", medir, true);
      window.addEventListener("resize", medir);
    };

    const procurar = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-tour="${target}"]`,
      );
      if (el) fixar(el);
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
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [target, timeoutMs]);

  return { rect, estado };
}
