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
      isAccountOwner: false,
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

  it("nunca expõe passo que navega para rota proibida", () => {
    let verificados = 0;

    for (const permissions of todasAsCombinacoes()) {
      for (const isDoctor of [false, true]) {
        for (const isAccountOwner of [false, true]) {
          const viewer = { permissions, isDoctor, isAccountOwner };
          for (const track of visibleTracks(viewer)) {
            for (const step of visibleSteps(track, viewer)) {
              if (!step.route) continue;
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

  it("a trilha de agenda cobre consulta, filtros, exportação e lembretes", () => {
    const trilha = trackById("agenda")!;
    expect(trilha.permission).toBe(Permission.AGENDA);
    expect(trilha.steps.map((p) => p.key)).toEqual([
      "nova-consulta",
      "horario",
      "status",
      "filtros",
      "exportar",
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
    const passos = visibleSteps(trilha, {
      permissions: [Permission.AGENDA, Permission.SOLICITACOES],
      isDoctor: false,
      isAccountOwner: false,
    });
    expect(passos.map((p) => p.key)).not.toContain("clinicas");
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
    expect(trilha.steps.find((p) => p.key === "areas")?.aguardaAcao).toBe(
      true,
    );
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

  it("agenda: modais de consulta, filtros e exportação acionam o driver", () => {
    expect(passo("agenda", "horario")?.acao).toBe(
      "agenda-abrir-novo-horario",
    );
    expect(passo("agenda", "status")?.acao).toBe("agenda-abrir-detalhe-demo");
    expect(passo("agenda", "filtros")?.acao).toBe("agenda-abrir-filtros");
    expect(passo("agenda", "filtros")?.target).toBe("agenda-filtros");
    expect(passo("agenda", "exportar")?.acao).toBe(
      "agenda-abrir-exportacao",
    );
    expect(passo("agenda", "exportar")?.target).toBe("agenda-exportar");
    expect(passo("agenda", "exportar")?.acaoAoAvancar).toBe(
      "agenda-fechar-modais",
    );
  });

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

  it("solicitacoes: por-documento fecha o wizard explicitamente ao entrar no passo", () => {
    expect(passo("solicitacoes", "por-documento")?.acao).toBe(
      "sc-fechar-wizard",
    );
  });

  it("solicitacoes: só conclui a análise ao avançar para a revisão", () => {
    expect(
      passo("solicitacoes", "documento-enviar")?.acaoAoAvancar,
    ).toBe("sc-concluir-analise-documento");
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
