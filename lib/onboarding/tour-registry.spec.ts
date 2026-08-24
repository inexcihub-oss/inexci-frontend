import { describe, it, expect } from "vitest";
import {
  ALL_PERMISSIONS,
  Permission,
  permissionForRoute,
} from "@/lib/permissions";
import {
  TRACKS,
  canSee,
  trackById,
  visibleSteps,
  visibleTracks,
} from "./tour-registry";
import type { TrackId } from "./state";

/** As 16 combinações de área, no molde de `lib/permissions.spec.ts`. */
function todasAsCombinacoes(): Permission[][] {
  const combos: Permission[][] = [];
  for (let mascara = 0; mascara < 1 << ALL_PERMISSIONS.length; mascara++) {
    combos.push(ALL_PERMISSIONS.filter((_, i) => mascara & (1 << i)));
  }
  return combos;
}

describe("canSee", () => {
  const base = { permissions: [], isDoctor: false, isAccountOwner: false };

  it("libera gate vazio", () => {
    expect(canSee({}, base)).toBe(true);
  });

  it("exige a área declarada", () => {
    expect(canSee({ permission: Permission.SOLICITACOES }, base)).toBe(false);
    expect(
      canSee(
        { permission: Permission.SOLICITACOES },
        { ...base, permissions: [Permission.SOLICITACOES] },
      ),
    ).toBe(true);
  });

  it("plano-e-cota é invisível para o admin delegado", () => {
    const delegado = {
      permissions: [Permission.ADMINISTRACAO],
      isDoctor: false,
      isAccountOwner: false, // é o que o distingue do dono
    };
    expect(visibleTracks(delegado).map((t) => t.id)).not.toContain(
      "plano-e-cota",
    );

    const dono = { ...delegado, isAccountOwner: true };
    expect(visibleTracks(dono).map((t) => t.id)).toContain("plano-e-cota");
  });

  it("requiresDoctor olha doctor_profile, não a área de atendimento", () => {
    expect(
      canSee(
        { requiresDoctor: true },
        { ...base, permissions: [Permission.ATENDIMENTO] },
      ),
    ).toBe(false);
    expect(canSee({ requiresDoctor: true }, { ...base, isDoctor: true })).toBe(
      true,
    );
  });

  /**
   * O admin delegado tem role 'admin' mas não é dono: um gate baseado em
   * `isAdmin` o mandaria para a aba de plano, que o devolve.
   */
  it("requiresOwner olha isAccountOwner", () => {
    expect(
      canSee({ requiresOwner: true }, { ...base, permissions: ALL_PERMISSIONS }),
    ).toBe(false);
    expect(
      canSee({ requiresOwner: true }, { ...base, isAccountOwner: true }),
    ).toBe(true);
  });

  it("anyArea recusa quem não tem área nenhuma", () => {
    expect(canSee({ anyArea: true }, base)).toBe(false);
    expect(
      canSee({ anyArea: true }, { ...base, permissions: [Permission.AGENDA] }),
    ).toBe(true);
  });
});

describe("visibleTracks", () => {
  it("esconde a trilha da assinatura de quem não é médico", () => {
    const trilhas = visibleTracks({
      permissions: [Permission.ATENDIMENTO, Permission.SOLICITACOES],
      isDoctor: false,
      isAccountOwner: false,
    });

    expect(trilhas.map((t) => t.id)).not.toContain("documentos-do-medico");
  });

  it("mostra a trilha da assinatura para o médico", () => {
    const trilhas = visibleTracks({
      permissions: [Permission.SOLICITACOES],
      isDoctor: true,
      isAccountOwner: false,
    });

    expect(trilhas.map((t) => t.id)).toContain("documentos-do-medico");
  });

  it("esconde a trilha de solicitações de quem não tem a área", () => {
    const trilhas = visibleTracks({
      permissions: [Permission.AGENDA],
      isDoctor: false,
      isAccountOwner: false,
    });

    expect(trilhas.map((t) => t.id)).not.toContain("solicitacoes");
  });

  it("mostra a trilha de solicitações para quem tem a área", () => {
    const trilhas = visibleTracks({
      permissions: [Permission.SOLICITACOES],
      isDoctor: false,
      isAccountOwner: false,
    });

    expect(trilhas.map((t) => t.id)).toContain("solicitacoes");
  });

  /**
   * A regra que evita o loop de redirect já visto neste projeto: nenhuma
   * trilha visível pode navegar para uma rota que o PermissionRouteGuard
   * bloqueia para aquele mesmo usuário.
   */
  it("nunca expõe passo que navega para rota proibida", () => {
    let verificados = 0;

    for (const permissions of todasAsCombinacoes()) {
      for (const isDoctor of [false, true]) {
        for (const isAccountOwner of [false, true]) {
          const viewer = { permissions, isDoctor, isAccountOwner };
          for (const track of visibleTracks(viewer)) {
            for (const step of visibleSteps(track, viewer)) {
              if (!step.route) continue;
              // A rota pode carregar query (`/configuracoes?tab=profile`), mas
              // `permissionForRoute` casa por prefixo de PATHNAME. Sem tirar a
              // query, o passo é pulado em silêncio — e continuaria pulado no
              // dia em que a rota ganhasse permissão, que é justamente quando
              // este guard importaria.
              const exigida = permissionForRoute(step.route.split("?")[0]);
              if (!exigida) continue;
              verificados++;
              expect(
                permissions.includes(exigida),
                `trilha ${track.id}, passo ${step.key}, rota ${step.route}`,
              ).toBe(true);
            }
          }
        }
      }
    }

    // As duas cláusulas de guarda acima podem esvaziar a varredura inteira sem
    // que ninguém perceba: um teste que não chega a assertar passa igual.
    expect(verificados).toBeGreaterThan(0);
  });
});

describe("TRACKS", () => {
  it("a trilha do médico cobre assinatura, cabeçalho e prévia", () => {
    const trilha = trackById("documentos-do-medico")!;
    expect(trilha.steps.map((p) => p.key)).toEqual([
      "assinatura",
      "cabecalho-logo",
      "cabecalho-texto",
      "previa",
    ]);
    // Só o primeiro passo é required: sem assinatura a trilha não tem assunto.
    // Os do cabeçalho degradam, porque a prévia só existe com conteúdo salvo.
    expect(trilha.steps.filter((p) => p.required).map((p) => p.key)).toEqual([
      "assinatura",
    ]);
  });

  it("as trilhas seguem a ordem de uso da plataforma", () => {
    expect(TRACKS.map((t) => t.id)).toEqual([
      "documentos-do-medico",
      "agenda",
      "atendimento",
      "solicitacoes",
      "dashboard",
      "cadastros",
      "administracao",
      "plano-e-cota",
    ]);
  });

  it("não passa de oito passos por trilha", () => {
    // A trilha `solicitacoes` chegou a 8 com a expansão "via documento"
    // (B2 do PLANO-ONBOARDING-TRILHAS-EXPANDIDAS): abrir-wizard,
    // kanban-status, filtro, cadastro-no-modal, requisitos, por-documento,
    // documento-enviar, documento-revisar. Subir o teto além disso merece
    // reabrir a decisão, não só editar este número.
    for (const track of TRACKS) {
      expect(track.steps.length).toBeLessThanOrEqual(8);
    }
  });

  it("não tem id de trilha nem chave de passo duplicados", () => {
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(TRACKS.length);
    for (const track of TRACKS) {
      const chaves = track.steps.map((s) => s.key);
      expect(new Set(chaves).size).toBe(chaves.length);
    }
  });

  it("a trilha de atendimento tem cinco passos e só o de emissão exige médico", () => {
    const trilha = trackById("atendimento")!;
    expect(trilha.permission).toBe(Permission.ATENDIMENTO);
    expect(trilha.steps).toHaveLength(5);
    expect(
      trilha.steps.filter((p) => p.requiresDoctor).map((p) => p.key),
    ).toEqual(["documentos"]);
  });

  it("a secretária com Atendimento não vê o passo de emitir documentos", () => {
    const trilha = trackById("atendimento")!;
    const passos = visibleSteps(trilha, {
      permissions: [Permission.ATENDIMENTO],
      isDoctor: false,
      isAccountOwner: false,
    });
    expect(passos.map((p) => p.key)).not.toContain("documentos");
  });

  it("a trilha de agenda tem quatro passos e o último não depende de alvo", () => {
    const trilha = trackById("agenda")!;
    expect(trilha.permission).toBe(Permission.AGENDA);
    expect(trilha.steps.map((p) => p.key)).toEqual([
      "nova-consulta",
      "horario",
      "status",
      "lembrete",
    ]);
    expect(trilha.steps.at(-1)!.target).toBeUndefined();
  });

  it("a trilha de cadastros é transversal (anyArea) e tem cinco passos", () => {
    const trilha = trackById("cadastros")!;
    expect(trilha.anyArea).toBe(true);
    expect(trilha.steps.map((p) => p.key)).toEqual([
      "pacientes",
      "menu",
      "clinicas",
      "procedimentos",
      "novo-modelo",
    ]);
  });

  it("quem não é administração não vê o passo de clínicas", () => {
    const trilha = trackById("cadastros")!;
    // Com Solicitações (e sem Administração) o passo de procedimentos segue
    // visível — o gate que este teste cobre é especificamente o de clínicas.
    const passos = visibleSteps(trilha, {
      permissions: [Permission.AGENDA, Permission.SOLICITACOES],
      isDoctor: false,
      isAccountOwner: false,
    });
    expect(passos.map((p) => p.key)).not.toContain("clinicas");
    // mas continua vendo os outros quatro (pacientes, menu, procedimentos, novo-modelo)
    expect(passos).toHaveLength(4);
  });

  it("a trilha de administração exige a área e tem quatro passos, só o de convidar obrigatório", () => {
    const trilha = trackById("administracao")!;
    expect(trilha.permission).toBe(Permission.ADMINISTRACAO);
    expect(trilha.steps.map((p) => p.key)).toEqual([
      "convidar",
      "areas",
      "vinculo",
      "ciclo",
    ]);
    expect(trilha.steps.filter((p) => p.required).map((p) => p.key)).toEqual([
      "convidar",
    ]);
    // "areas" mora dentro do modal de edição do colaborador — o alvo só
    // existe depois de o usuário abrir a ficha, daí `aguardaAcao`.
    expect(trilha.steps.find((p) => p.key === "areas")?.aguardaAcao).toBe(
      true,
    );
    // "vinculo" e "ciclo" navegam para a ficha de um colaborador FABRICADO
    // (`TOUR_DEMO_COLLABORATOR_ID`) — nunca existe de verdade, então o alvo
    // real existe mesmo no primeiro tour.
    expect(trilha.steps.find((p) => p.key === "vinculo")?.target).toBe(
      "colaborador-vinculo-medico",
    );
    expect(trilha.steps.find((p) => p.key === "vinculo")?.route).toBe(
      "/colaboradores/assistente/tour-demo-colaborador",
    );
    expect(trilha.steps.find((p) => p.key === "ciclo")?.target).toBe(
      "colaborador-ciclo-status",
    );
  });

  it("quem não tem Administração não vê a trilha de administração", () => {
    const trilhas = visibleTracks({
      permissions: [Permission.AGENDA, Permission.ATENDIMENTO],
      isDoctor: false,
      isAccountOwner: false,
    });
    expect(trilhas.map((t) => t.id)).not.toContain("administracao");
  });

  it("a trilha do dashboard exige Solicitações e tem três passos, só o primeiro obrigatório e com aguardaAcao", () => {
    const trilha = trackById("dashboard")!;
    expect(trilha.permission).toBe(Permission.SOLICITACOES);
    expect(trilha.steps.map((p) => p.key)).toEqual([
      "kpis",
      "filtros",
      "kanban",
    ]);
    expect(trilha.steps.filter((p) => p.required).map((p) => p.key)).toEqual([
      "kpis",
    ]);
    expect(trilha.steps.find((p) => p.key === "kpis")?.aguardaAcao).toBe(true);
  });

  it("quem não tem Solicitações não vê a trilha do dashboard", () => {
    const trilhas = visibleTracks({
      permissions: [Permission.AGENDA, Permission.ATENDIMENTO],
      isDoctor: false,
      isAccountOwner: false,
    });
    expect(trilhas.map((t) => t.id)).not.toContain("dashboard");
  });
});

describe("passos dirigidos pelo tour (Driver)", () => {
  function passo(trackId: TrackId, stepKey: string) {
    const track = trackById(trackId);
    return track?.steps.find((s) => s.key === stepKey);
  }

  it("agenda: horario e status acionam o driver", () => {
    expect(passo("agenda", "horario")?.acao).toBe(
      "agenda-abrir-novo-horario",
    );
    expect(passo("agenda", "status")?.acao).toBe("agenda-abrir-detalhe-demo");
  });

  /**
   * Bug real achado pelo usuário: o passo "hub" falava da lista de
   * consultas mas destacava o botão de criação. A âncora certa é o grupo de
   * abas Hoje/Próximas/Realizadas.
   */
  it("atendimento: hub aponta para o grupo de abas, não para o botão de nova consulta", () => {
    expect(passo("atendimento", "hub")?.target).toBe("atendimento-abas");
  });

  it("atendimento: iniciar aciona o driver e abas navega para a página demo", () => {
    expect(passo("atendimento", "iniciar")?.acao).toBe(
      "atendimento-abrir-detalhe-demo",
    );
    expect(passo("atendimento", "abas")?.route).toBe("/atendimento/tour-demo");
    expect(passo("atendimento", "indicacao")?.target).toBe("ficha-indicacao");
    expect(passo("atendimento", "documentos")?.target).toBe(
      "ficha-documentos",
    );
  });

  it("solicitacoes: cadastro-no-modal ganha alvo real e aciona o driver", () => {
    const p = passo("solicitacoes", "cadastro-no-modal");
    expect(p?.acao).toBe("sc-abrir-cadastro-transversal");
    expect(p?.target).toBe("sc-wizard-novo-cadastro");
  });

  /**
   * Bug real achado pelo usuário: navegar para a MESMA rota do passo
   * anterior é no-op no Next.js — sem fechar o wizard explicitamente, ele
   * continuava por cima do alvo `sc-por-documento`.
   */
  it("solicitacoes: por-documento fecha o wizard explicitamente ao entrar no passo", () => {
    expect(passo("solicitacoes", "por-documento")?.acao).toBe(
      "sc-fechar-wizard",
    );
  });

  it("solicitacoes: mantém a etapa de análise até a pessoa avançar", () => {
    expect(
      passo("solicitacoes", "documento-enviar")?.keepOpenWhenTargetMissing,
    ).toBe(true);
  });

  it("administracao: areas aciona o driver", () => {
    expect(passo("administracao", "areas")?.acao).toBe(
      "administracao-abrir-novo-colaborador",
    );
  });

  it("cadastros: novo-modelo aciona o driver", () => {
    expect(passo("cadastros", "novo-modelo")?.acao).toBe(
      "procedimentos-abrir-novo-modelo",
    );
  });

  it("cadastros: menu abre o overflow no mobile", () => {
    expect(passo("cadastros", "menu")?.acao).toBe(
      "cadastros-abrir-menu-mobile",
    );
    expect(passo("cadastros", "menu")?.aguardaAcao).toBe(true);
  });
});
