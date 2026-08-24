"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { GripHorizontal } from "lucide-react";
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
const BREAKPOINT_DESKTOP = 1024;
// Estimativa conservadora até a primeira medição do DOM. O balão real é
// medido logo depois por `useLayoutEffect`; 190 px era baixo demais para uma
// copy de duas linhas + controles e fazia o tour cobrir o alvo no mobile.
const ALTURA_BALAO_INICIAL = 360;
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

interface Ponto {
  x: number;
  y: number;
}

export function TourOverlay({ trackId, onClose }: Props) {
  const router = useRouter();
  const { viewer, executarAcao } = useOnboarding();
  const [indice, setIndice] = useState(0);
  const [montado, setMontado] = useState(false);
  const [interrompido, setInterrompido] = useState(false);
  const balaoRef = useRef<HTMLDivElement>(null);
  const [alturaBalao, setAlturaBalao] = useState(ALTURA_BALAO_INICIAL);
  const [deslocamento, setDeslocamento] = useState<Ponto>({ x: 0, y: 0 });
  const [arrastando, setArrastando] = useState(false);
  const arrasteRef = useRef<Ponto | null>(null);

  useEffect(() => setMontado(true), []);

  // Posicionamento não pode supor uma altura fixa: copy dinâmica, zoom do
  // navegador e fonte do usuário fazem o balão crescer. Mede antes de pintar
  // e acompanha mudanças de conteúdo/tamanho para nunca encobrir o alvo.
  useLayoutEffect(() => {
    const balao = balaoRef.current;
    if (!balao) return;

    const medir = () => {
      const medida = Math.ceil(balao.getBoundingClientRect().height);
      if (medida > 0) {
        setAlturaBalao((atual) => (atual === medida ? atual : medida));
      }
    };
    medir();

    const observador =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(medir);
    observador?.observe(balao);
    window.addEventListener("resize", medir);
    return () => {
      observador?.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [montado, trackId, indice]);

  const track = trackById(trackId);
  const passos = useMemo(
    () => (track ? visibleSteps(track, viewer) : []),
    [track, viewer],
  );
  const passo = passos[indice];
  const alvo =
    passo?.mobileTarget &&
    typeof window !== "undefined" &&
    window.innerWidth < BREAKPOINT_DESKTOP
      ? passo.mobileTarget
      : passo?.target;

  // Cada passo começa junto ao elemento que explica. O deslocamento é local
  // ao passo atual para que mover um card não estrague a posição do próximo.
  useEffect(() => {
    setDeslocamento({ x: 0, y: 0 });
    setArrastando(false);
    arrasteRef.current = null;
  }, [trackId, indice]);

  const iniciarArraste = useCallback(
    (evento: React.PointerEvent<HTMLDivElement>) => {
      if (evento.pointerType === "mouse" && evento.button !== 0) return;
      evento.preventDefault();
      arrasteRef.current = { x: evento.clientX, y: evento.clientY };
      evento.currentTarget.setPointerCapture?.(evento.pointerId);
      setArrastando(true);
    },
    [],
  );

  const moverBalao = useCallback(
    (evento: React.PointerEvent<HTMLDivElement>) => {
      const inicio = arrasteRef.current;
      const balao = balaoRef.current;
      if (!inicio || !balao) return;

      const retangulo = balao.getBoundingClientRect();
      const deltaX = evento.clientX - inicio.x;
      const deltaY = evento.clientY - inicio.y;
      const deslocamentoX = Math.min(
        Math.max(deltaX, MARGEM - retangulo.left),
        window.innerWidth - MARGEM - retangulo.right,
      );
      const deslocamentoY = Math.min(
        Math.max(deltaY, MARGEM - retangulo.top),
        window.innerHeight - MARGEM - retangulo.bottom,
      );

      setDeslocamento((atual) => ({
        x: atual.x + deslocamentoX,
        y: atual.y + deslocamentoY,
      }));
      arrasteRef.current = { x: evento.clientX, y: evento.clientY };
    },
    [],
  );

  const encerrarArraste = useCallback(
    (evento: React.PointerEvent<HTMLDivElement>) => {
      if (!arrasteRef.current) return;
      if (evento.currentTarget.hasPointerCapture?.(evento.pointerId)) {
        evento.currentTarget.releasePointerCapture?.(evento.pointerId);
      }
      arrasteRef.current = null;
      setArrastando(false);
    },
    [],
  );

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
  const { rect, estado } = useTargetRect(alvo, {
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
    if (estado !== "ausente" || !alvo) return;
    // Alguns passos disparam uma ação que navega por conta própria. O alvo
    // visual da etapa anterior deixa de existir, mas a leitura deve ficar sob
    // controle da pessoa — nunca avançar sozinha para a próxima explicação.
    if (passo.keepOpenWhenTargetMissing) return;
    if (passo.required) {
      setInterrompido(true);
      return;
    }
    avancar();
  }, [estado, alvo, passo?.keepOpenWhenTargetMissing, passo?.required, avancar]);

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
    const limiteInferior = window.innerHeight - RESERVA_RODAPE;
    const cabeAbaixo =
      rect.bottom + MARGEM + alturaBalao <= limiteInferior;
    const cabeAcima = rect.top - MARGEM - alturaBalao >= MARGEM;
    const maxTop = Math.max(MARGEM, limiteInferior - alturaBalao);
    const espacoAcima = rect.top - MARGEM;
    const espacoAbaixo = limiteInferior - rect.bottom - MARGEM;
    const topBruto = cabeAbaixo
      ? rect.bottom + MARGEM
      : cabeAcima || espacoAcima >= espacoAbaixo
        ? rect.top - MARGEM - alturaBalao
        : rect.bottom + MARGEM;
    const top = Math.min(Math.max(MARGEM, topBruto), maxTop);
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
      top + alturaBalao > rect.top;
    if (sobrepoe) {
      const cabeADireita =
        rect.right + MARGEM + LARGURA_BALAO <= window.innerWidth - MARGEM;
      left = cabeADireita
        ? rect.right + MARGEM
        : Math.max(MARGEM, rect.left - MARGEM - LARGURA_BALAO);
    }

    return { top, left } as const;
  }, [rect, alturaBalao]);

  const transformacaoBase =
    "transform" in posicaoBalao ? posicaoBalao.transform : "";

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
          transform: `${transformacaoBase} translate3d(${deslocamento.x}px, ${deslocamento.y}px, 0)`,
        }}
        className={`pointer-events-auto absolute max-h-[calc(100dvh-7.5rem)] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl focus:outline-none md:max-h-[calc(100dvh-2rem)] ${
          arrastando ? "select-none" : ""
        }`}
      >
        <div
          data-tour-drag-handle
          aria-label="Arraste para mover a explicação"
          onPointerDown={iniciarArraste}
          onPointerMove={moverBalao}
          onPointerUp={encerrarArraste}
          onPointerCancel={encerrarArraste}
          className="mb-2 flex cursor-grab touch-none items-center gap-1.5 text-xs font-medium text-neutral-400 active:cursor-grabbing"
        >
          <GripHorizontal className="h-4 w-4" aria-hidden="true" />
          Arraste para mover
        </div>
        <button
          type="button"
          onClick={() => onClose()}
          className="mb-3 min-h-10 text-sm font-semibold text-primary-700 underline decoration-primary-300 underline-offset-4 transition-colors hover:text-primary-800 hover:decoration-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
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
