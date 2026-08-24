"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  TOUR_UI,
  TRILHA_ADMINISTRACAO,
  TRILHA_SOLICITACOES,
} from "@/lib/onboarding/content";
import { PERMISSION_DESCRIPTIONS } from "@/lib/permissions";
import type { TrackId } from "@/lib/onboarding/state";
import {
  trackById,
  visibleSteps,
  type TourStep,
} from "@/lib/onboarding/tour-registry";
import { fetchRequisitosPendente } from "@/services/onboarding-requirements";
import { STATUS_NUMBER_TO_STRING } from "@/services/surgery-request.service";
import { useOnboarding } from "./OnboardingProvider";
import { TIMEOUT_AGUARDA_ACAO_MS, useTargetRect } from "./useTargetRect";

const PADDING_FURO = 8;
const LARGURA_BALAO = 320;
const MARGEM = 16;
// Reserva do rodapé: a `BottomNavBar` cobre a base da tela no mobile e o
// balão posicionado por `top` cairia atrás dela — o usuário veria o holofote
// e não veria a instrução.
const RESERVA_RODAPE = 88;

/** Estático: as quatro descrições não mudam por sessão. */
const DESCRICOES_DE_AREA = Object.values(PERMISSION_DESCRIPTIONS);

/**
 * Corpo do passo atual. A maioria vem pronta de `passo.corpo`, mas dois
 * passos são montados em runtime a partir de dado assíncrono ou de outro
 * módulo — cada `key` especial ganha um `case` aqui em vez de uma cascata de
 * ternários no JSX.
 */
function corpoDoPasso(
  passo: TourStep,
  ctx: { requisitos: string[] | null; descricoesDeArea: string[] },
): string {
  switch (passo.key) {
    case "requisitos":
      return TRILHA_SOLICITACOES.passos.requisitos.comRequisitos(
        ctx.requisitos ?? [],
      );
    case "kanban-status":
      return TRILHA_SOLICITACOES.passos.kanbanStatus.comStatus(
        Object.values(STATUS_NUMBER_TO_STRING),
      );
    case "areas":
      return TRILHA_ADMINISTRACAO.passos.areas.comAreas(
        ctx.descricoesDeArea,
      );
    default:
      return passo.corpo;
  }
}

interface Props {
  trackId: TrackId;
  onClose: (opts?: { concluido?: boolean }) => void;
}

export function TourOverlay({ trackId, onClose }: Props) {
  const router = useRouter();
  const { viewer, executarAcao } = useOnboarding();
  const [indice, setIndice] = useState(0);
  const [montado, setMontado] = useState(false);
  const [interrompido, setInterrompido] = useState(false);
  const balaoRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMontado(true), []);

  const track = trackById(trackId);
  const passos = useMemo(
    () => (track ? visibleSteps(track, viewer) : []),
    [track, viewer],
  );
  const passo = passos[indice];

  const [requisitos, setRequisitos] = useState<string[] | null>(null);

  // Só busca quando o passo dos requisitos entra em cena, e só uma vez por
  // montagem do overlay.
  useEffect(() => {
    if (passo?.key !== "requisitos" || requisitos !== null) return;
    let cancelado = false;
    void fetchRequisitosPendente().then((rotulos) => {
      if (!cancelado) setRequisitos(rotulos);
    });
    return () => {
      cancelado = true;
    };
  }, [passo?.key, requisitos]);

  // O timeout de 3s do hook é dimensionado para passo com `route`, cuja tela
  // ainda vai montar. Para um passo que o tour pode simplesmente pular, 3s de
  // espera viram um buraco morto no caminho NORMAL. `aguardaAcao` tem
  // prioridade sobre `route`: o alvo só existe depois de o usuário agir, então
  // o motor precisa esperar bem mais (20s) do que o tempo de uma navegação.
  const { rect, estado } = useTargetRect(passo?.target, {
    timeoutMs: passo?.aguardaAcao
      ? TIMEOUT_AGUARDA_ACAO_MS
      : passo?.route
        ? 3000
        : 800,
  });

  // Passo com `route` navega antes de procurar o alvo.
  useEffect(() => {
    if (passo?.route) router.push(passo.route);
  }, [passo?.route, router]);

  // Passo com `acao` aciona o registro externo (abrir modal, trocar estado
  // interno) ao ENTRAR no passo — em vez de esperar o usuário achar o botão
  // sozinho, como só `aguardaAcao` fazia até aqui. Tenta por até 3s porque
  // quem registra a ação pode montar um instante depois do commit em que
  // `indice` mudou (ex.: acabou de navegar para uma rota nova) — mesmo
  // idioma de "tenta até achar" do `useTargetRect`.
  useEffect(() => {
    const acao = passo?.acao;
    if (!acao) return;
    let cancelado = false;
    let tentativas = 0;
    const tentar = () => {
      if (cancelado) return;
      const executou = executarAcao(acao);
      if (!executou && tentativas < 20) {
        tentativas++;
        setTimeout(tentar, 150);
      }
    };
    tentar();
    return () => {
      cancelado = true;
    };
  }, [passo?.acao, executarAcao]);

  const avancar = useCallback(() => {
    // A decisão de concluir fica FORA do updater de propósito. Dentro dele,
    // `onClose` roda durante o render do TourOverlay e o `setActiveTour` do
    // provider vira "Cannot update a component while rendering a different
    // component" — e o StrictMode, que executa updaters duas vezes, dobrava o
    // efeito colateral. Updater é para calcular estado, não para disparar ação.
    if (indice >= passos.length - 1) {
      onClose({ concluido: true });
      return;
    }
    setIndice((i) => i + 1);
  }, [indice, passos.length, onClose]);

  const voltar = useCallback(() => setIndice((i) => Math.max(0, i - 1)), []);

  /**
   * Degradação por alvo ausente. `required: false` (padrão) pula o passo em
   * silêncio: alvos somem por motivos rotineiros e travar o tour aí é pior do
   * que seguir sem aquele destaque. `required: true` encerra com aviso — mas
   * não fecha calado: o usuário precisa saber que o tour parou por falta da
   * tela, não porque ele fez algo (`onClose()` puro seria indistinguível de
   * "Sair do tour").
   */
  useEffect(() => {
    if (estado !== "ausente" || !passo?.target) return;
    if (passo.required) {
      setInterrompido(true);
      return;
    }
    avancar();
  }, [estado, passo?.target, passo?.required, avancar]);

  // Teclado: Esc sai, setas navegam.
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onClose();
      } else if (evento.key === "ArrowRight") {
        avancar();
      } else if (evento.key === "ArrowLeft") {
        voltar();
      } else if (evento.key === "Tab") {
        // Foco preso no balão: fora dele está a página real, e deixar o Tab
        // escapar faz o usuário perder de vista onde estava o tour.
        const foco = balaoRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!foco?.length) return;
        const primeiro = foco[0];
        const ultimo = foco[foco.length - 1];
        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [avancar, voltar, onClose]);

  // Depende de `montado` e `estado` de propósito: no primeiro commit o
  // componente ainda devolve `null` e `balaoRef` é nulo. Com dependência só em
  // `indice` (que não muda entre esse commit e o seguinte), o efeito nunca
  // reexecutava — e o foco jamais entrava no balão no PRIMEIRO passo do tour.
  //
  // Foca o DIÁLOGO (`balaoRef.current`), não o primeiro botão dele. O
  // primeiro botão focável é sempre "Sair do tour" (spec §3.1) — é a ação
  // dispensiva, e focar automaticamente nela faz um usuário de teclado que
  // aperta Enter no reflexo (comum ao abrir qualquer diálogo) sair do tour
  // sem querer. O `tabIndex={-1}` no `<div role="dialog">` permite o foco
  // programático sem entrar na ordem de tab normal.
  useEffect(() => {
    if (!montado || estado === "buscando") return;
    balaoRef.current?.focus();
  }, [indice, montado, estado, interrompido]);

  const posicaoBalao = useMemo(() => {
    if (!rect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      } as const;
    }
    const alturaEstimada = 190;
    const cabeAbaixo =
      rect.bottom + MARGEM + alturaEstimada <
      window.innerHeight - RESERVA_RODAPE;
    const topBruto = cabeAbaixo
      ? rect.bottom + MARGEM
      : Math.max(MARGEM, rect.top - MARGEM - alturaEstimada);
    const top = Math.min(
      topBruto,
      window.innerHeight - RESERVA_RODAPE - alturaEstimada,
    );
    let left = Math.min(
      Math.max(MARGEM, rect.left),
      Math.max(MARGEM, window.innerWidth - LARGURA_BALAO - MARGEM),
    );

    // O cálculo acima só evita o balão sair da viewport — não evita ele
    // cair EM CIMA do próprio alvo. Perto de um canto sem espaço livre
    // (ex.: botão no rodapé de um modal pequeno), "abaixo"/"acima" e o
    // clamp de viewport podem colidir mesmo assim. Detectada a colisão,
    // empurra o balão para o lado do alvo em vez de deixá-lo por cima.
    const sobrepoe =
      left < rect.right &&
      left + LARGURA_BALAO > rect.left &&
      top < rect.bottom &&
      top + alturaEstimada > rect.top;
    if (sobrepoe) {
      const cabeADireita =
        rect.right + MARGEM + LARGURA_BALAO <= window.innerWidth - MARGEM;
      left = cabeADireita
        ? rect.right + MARGEM
        : Math.max(MARGEM, rect.left - MARGEM - LARGURA_BALAO);
    }

    return { top, left } as const;
  }, [rect]);

  if (!montado) return null;

  if (interrompido) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-neutral-950/55">
        <div
          ref={balaoRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-interrompido"
          tabIndex={-1}
          className="absolute left-1/2 top-1/2 w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl focus:outline-none"
        >
          <h3
            id="tour-interrompido"
            className="text-base font-semibold text-neutral-900"
          >
            Tour interrompido
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            {TOUR_UI.interrompido}
          </p>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => onClose()}
              className="rounded-xl bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  if (!track || !passo) return null;

  // Passo comum: a busca dura no máximo 800 ms e termina em holofote ou em
  // pulo. Mostrar o balão nesse intervalo produziria um piscar. Passo
  // `aguardaAcao` é o contrário: a espera É o passo — o usuário precisa LER a
  // instrução para saber o que clicar, e um fundo escurecido mudo por 20 s
  // parece tour quebrado.
  if (estado === "buscando" && !passo.aguardaAcao) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-neutral-950/55" aria-hidden />,
      document.body,
    );
  }

  const tituloId = `tour-${trackId}-${passo.key}`;
  const ehUltimo = indice === passos.length - 1;

  return createPortal(
    // `pointer-events-none` aqui é o que devolve o clique ao resto da página
    // (o furo do spotlight não é suficiente: sem isso, o `<div>` cobre a
    // viewport inteira e captura todo clique, inclusive sobre o elemento
    // destacado). Só o balão religa `pointer-events-auto` — é a única parte
    // clicável do overlay.
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <mask id="tour-furo">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - PADDING_FURO}
                y={rect.top - PADDING_FURO}
                width={rect.width + PADDING_FURO * 2}
                height={rect.height + PADDING_FURO * 2}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgb(10 10 10 / 0.55)"
          mask="url(#tour-furo)"
        />
      </svg>

      <div
        ref={balaoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        style={{
          ...posicaoBalao,
          width: LARGURA_BALAO,
          maxWidth: "calc(100vw - 32px)",
        }}
        className="pointer-events-auto absolute rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl focus:outline-none"
      >
        <button
          type="button"
          onClick={() => onClose()}
          className="mb-3 text-xs font-medium text-neutral-600 hover:text-neutral-800"
        >
          {TOUR_UI.sair}
        </button>

        {/*
          `aria-live="polite"` no bloco de texto do passo: o balão fica
          montado entre um passo e outro, só o conteúdo troca, e o
          `aria-labelledby` do diálogo aponta para um `id` que muda junto —
          alguns leitores de tela não reanunciam sozinhos. Isso garante que a
          troca de passo é falada mesmo sem remontar o diálogo.
        */}
        <div aria-live="polite">
          <p
            className="text-xs font-medium text-neutral-500"
            aria-label={`Passo ${indice + 1} de ${passos.length}`}
          >
            {`${indice + 1} de ${passos.length}`}
          </p>
          <h3
            id={tituloId}
            className="mt-1 text-base font-semibold text-neutral-900"
          >
            {passo.titulo}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            {corpoDoPasso(passo, {
              requisitos,
              descricoesDeArea: DESCRICOES_DE_AREA,
            })}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {indice > 0 && (
            <button
              type="button"
              onClick={voltar}
              className="rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              {TOUR_UI.anterior}
            </button>
          )}
          <button
            type="button"
            onClick={avancar}
            className="rounded-xl bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            {ehUltimo ? TOUR_UI.concluir : TOUR_UI.proximo}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
